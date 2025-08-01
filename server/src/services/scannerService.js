import fs from 'fs';
import path from 'path';
import { File } from '../models/file.js';
import { sendSlackNotification } from './notificationService.js';

// Dangerous keywords that indicate malware
const DANGEROUS_KEYWORDS = [
  'rm -rf',
  'eval',
  'bitcoin',
  'malware',
  'virus',
  'trojan',
  'ransomware',
  'keylogger',
  'backdoor',
  'rootkit',
  'exploit',
  'payload',
  'shell',
  'injection'
];


export const scanFile = async (fileId) => {
  const scanStartTime = Date.now();
  
  try {
    // Find file in database
    const file = await File.findById(fileId);
    if (!file) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    // Update status to scanning
    await File.findByIdAndUpdate(fileId, { status: 'scanning' });

    console.log(`Starting scan for file: ${file.originalName}`);

    // Simulate scanning delay (2-5 seconds)
    const scanDelay = Math.random() * 3000 + 2000; // Random delay between 2-5 seconds
    await new Promise(resolve => setTimeout(resolve, scanDelay));

    // Read file content for analysis
    const fileContent = await readFileContent(file.path);
    
    // Debug: Log content length and sample
    console.log(`File content length: ${fileContent.length}`);
    console.log(`File content sample: ${fileContent.substring(0, 200)}...`);
    
    // Perform malware detection
    const scanResult = await performMalwareDetection(fileContent, file);
    
    const scanDuration = Date.now() - scanStartTime;
    scanResult.scanDuration = scanDuration;

    // Update file in database
    await File.findByIdAndUpdate(fileId, {
      status: 'scanned',
      result: scanResult.isInfected ? 'infected' : 'clean',
      scannedAt: new Date(),
      scanDuration,
      threatDetails: scanResult.threatDetails
    });

    console.log(`Scan completed for ${file.originalName}: ${scanResult.isInfected ? 'INFECTED' : 'CLEAN'}`);

    // Send notification if infected
    if (scanResult.isInfected) {
      try {
        await sendSlackNotification(file, scanResult);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
        // Don't throw - scanning succeeded even if notification failed
      }
    }

    return scanResult;
  } catch (error) {
    console.error(`Scan failed for file ${fileId}:`, error);
    
    // Mark as scanned with error
    await File.findByIdAndUpdate(fileId, {
      status: 'scanned',
      result: 'clean', // Default to clean on scan error
      scannedAt: new Date(),
      scanDuration: Date.now() - scanStartTime,
      threatDetails: `Scan error: ${error.message}`
    });

    throw error;
  }
};

const readFileContent = async (filePath) => {
  try {
    const fullPath = path.resolve(filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileExtension = path.extname(fullPath).toLowerCase();
    
    // Handle different file types
    if (fileExtension === '.pdf') {
      // For PDF files, read as binary and extract text content
      const buffer = fs.readFileSync(fullPath);
      return extractTextFromPDF(buffer);
    } else if (fileExtension === '.docx') {
      // For DOCX files, read as binary and extract text content
      const buffer = fs.readFileSync(fullPath);
      return extractTextFromDOCX(buffer);
    } else {
      // For other files (images, etc.), try to read as text but handle binary gracefully
      try {
        return fs.readFileSync(fullPath, 'utf8');
      } catch (textError) {
        // If UTF-8 fails, read as binary and try to extract any text
        const buffer = fs.readFileSync(fullPath);
        return extractTextFromBinary(buffer);
      }
    }
  } catch (error) {
    console.error('Error reading file:', error);
    // Return empty string on read error - file will be marked as clean
    return '';
  }
};

const extractTextFromPDF = (buffer) => {
  try {
    // Convert buffer to string for analysis
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 50000)); // Read first 50KB
    
    // Method 1: Look for text streams in PDF
    const streamMatches = content.match(/stream\s*([\s\S]*?)\s*endstream/gi);
    if (streamMatches) {
      const streamText = streamMatches.join(' ');
      // Extract readable text from streams
      const readableFromStream = streamText.match(/[a-zA-Z0-9\s]{5,}/g);
      if (readableFromStream) {
        return readableFromStream.join(' ');
      }
    }
    
    // Method 2: Look for text objects (BT/ET markers)
    const textMatches = content.match(/BT\s*([\s\S]*?)\s*ET/gi);
    if (textMatches) {
      const textContent = textMatches.join(' ');
      const readableText = textContent.match(/[a-zA-Z0-9\s]{5,}/g);
      if (readableText) {
        return readableText.join(' ');
      }
    }
    
    // Method 3: Look for Tj operators (text showing operators)
    const tjMatches = content.match(/\(([^)]+)\)\s*Tj/gi);
    if (tjMatches) {
      return tjMatches.join(' ');
    }
    
    // Method 4: Look for any readable text patterns in the entire content
    const readableText = content.match(/[a-zA-Z0-9\s]{10,}/g);
    if (readableText) {
      return readableText.join(' ');
    }
    
    // Method 5: Look for base64 encoded content that might contain text
    const base64Matches = content.match(/base64[:\s]*([A-Za-z0-9+/=]+)/gi);
    if (base64Matches) {
      return base64Matches.join(' ');
    }
    
    // Fallback: return the raw content for pattern matching
    return content;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return '';
  }
};

const extractTextFromDOCX = (buffer) => {
  try {
    // Simple DOCX text extraction - look for XML content
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)); // Read first 10KB
    
    // Extract text from XML-like content
    const textMatches = content.match(/<[^>]*>([^<]*)<\/[^>]*>/g);
    if (textMatches) {
      return textMatches.join(' ');
    }
    
    // Fallback: look for readable text patterns
    const readableText = content.match(/[a-zA-Z0-9\s]{10,}/g);
    if (readableText) {
      return readableText.join(' ');
    }
    
    return content;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return '';
  }
};

const extractTextFromBinary = (buffer) => {
  try {
    // Try to extract any readable text from binary data
    const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000)); // Read first 10KB
    
    // Look for readable text patterns
    const readableText = content.match(/[a-zA-Z0-9\s]{10,}/g);
    if (readableText) {
      return readableText.join(' ');
    }
    
    return content;
  } catch (error) {
    console.error('Error extracting text from binary:', error);
    return '';
  }
};

const performMalwareDetection = async (content, file) => {
  const detectedThreats = [];

  // Check filename for suspicious patterns
  const suspiciousFilenamePatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.scr$/i,
    /malware/i,
    /virus/i,
    /trojan/i
  ];

  for (const pattern of suspiciousFilenamePatterns) {
    if (pattern.test(file.originalName)) {
      detectedThreats.push(`Suspicious filename pattern: ${pattern.source}`);
    }
  }

  // Check content for dangerous keywords
  const foundKeywords = [];
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
    }
  }

  if (foundKeywords.length > 0) {
    detectedThreats.push(`Dangerous keywords found: ${foundKeywords.join(', ')}`);
  }

  // Additional heuristic checks
  const suspiciousPatterns = [
    /base64/gi,
    /powershell/gi,
    /cmd\.exe/gi,
    /wget/gi,
    /curl.*http/gi,
    /encryption/gi,
    /decrypt/gi,
    /http:\/\/[^\s]+/gi,  // URLs
    /ftp:\/\/[^\s]+/gi,   // FTP URLs
    /eval\s*\(/gi,        // eval() calls
    /exec\s*\(/gi,        // exec() calls
    /system\s*\(/gi,      // system() calls
    /shell_exec/gi,       // shell_exec calls
    /passthru/gi,         // passthru calls
    /backdoor/gi,         // backdoor references
    /keylogger/gi,        // keylogger references
    /rootkit/gi,          // rootkit references
    /exploit/gi,          // exploit references
    /payload/gi,          // payload references
    /injection/gi,        // injection references
    /bypass/gi,           // bypass references
    /malicious/gi,        // malicious references
    /suspicious/gi        // suspicious references
  ];

  const foundPatterns = [];
  for (const pattern of suspiciousPatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) { // Flag if pattern appears at least once
      foundPatterns.push(`${pattern.source}: ${matches.length} occurrences`);
    }
  }

  if (foundPatterns.length >= 1) {
    detectedThreats.push(`Suspicious patterns detected: ${foundPatterns.join(', ')}`);
  }

  // Check file size for suspicious behavior (very small or unusually large)
  if (file.size < 100) {
    detectedThreats.push('Suspiciously small file size');
  }

  const isInfected = detectedThreats.length > 0;
  const threatDetails = isInfected ? detectedThreats.join('; ') : undefined;

  return {
    isInfected,
    threatDetails
  };
};