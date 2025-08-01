
## Run Locally

Clone the project

```bash
  git clone https://github.com/sumitprajapati1/file-scanner.git
```

Go to the project directory

```bash
  cd file-scanner
```

### Install Backend dependencies

```bash
  cd server
  npm install
```

Create .env file 
```bash
PORT=3000
RABBITMQ_URL=amqp://localhost:5672 ( mostly this )
MONGODB_URI= your_local_url 
```
Start Local RabbitMQ (Windows):

Step 1: Install RabbitMQ from website

Step 2: Run below command in cmd administrator 
```bash
rabbitmq-plugins enable rabbitmq_management
```

```bash
rabbitmq-server
```

Access RabbitMQ UI at: http://localhost:15672
Login: guest / guest

Now Start the server
```bash
  npm run dev:all 
```


### Install Frontend dependencies


```bash
cd client1
npm install
npm run dev 
```

### How Scanning Works
File metadata is stored in MongoDB.

A job is queued to RabbitMQ.

Worker simulates scanning using setTimeout(2–5s).

File is marked:

clean if no keywords

infected if it contains rm -rf, eval, or bitcoin

MongoDB is updated with results.

Dashboard updates every 5–10s to reflect status.


