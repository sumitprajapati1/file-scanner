import axios from 'axios';


export const sendSlackNotification = async (file, scanResult) => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured, skipping notification');
    return;
  }

  try {
    const message = {
      text: "MALWARE DETECTED",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Malware Detection Alert"
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*File Name:*\n${file.originalName}`
            },
            {
              type: "mrkdwn",
              text: `*File Size:*\n${formatFileSize(file.size)}`
            },
            {
              type: "mrkdwn",
              text: `*Upload Time:*\n${formatTimestamp(file.uploadedAt)}`
            },
            {
              type: "mrkdwn",
              text: `*Scan Time:*\n${formatTimestamp(file.scannedAt)}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Threat Details:*\n\`\`\`${scanResult.threatDetails}\`\`\``
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Scan Duration:* ${scanResult.scanDuration}ms\n*File ID:* ${file._id}`
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "File has been quarantined and marked as infected in the system."
            }
          ]
        }
      ]
    };

    await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000 // 5 second timeout
    });

    console.log('Slack notification sent successfully');
  } catch (error) {
    console.error('Failed to send Slack notification:', error.message);
    throw new Error(`Slack notification failed: ${error.message}`);
  }
};

export const sendWebhookNotification = async (file, scanResult) => {
  const webhookUrl = process.env.CUSTOM_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return; // No custom webhook configured
  }

  try {
    const payload = {
      event: 'malware_detected',
      timestamp: new Date().toISOString(),
      file: {
        id: file._id,
        filename: file.originalName,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt: file.uploadedAt,
        scannedAt: file.scannedAt
      },
      scan: {
        result: 'infected',
        duration: scanResult.scanDuration,
        threatDetails: scanResult.threatDetails
      }
    };

    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-CyberXplore-Event': 'malware_detected'
      },
      timeout: 5000
    });

    console.log('Custom webhook notification sent successfully');
  } catch (error) {
    console.error('Failed to send webhook notification:', error.message);
    // Don't throw - this is optional
  }
};

const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const formatTimestamp = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });
};  