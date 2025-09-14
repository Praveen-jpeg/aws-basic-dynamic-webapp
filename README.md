## Basic Dynamic Web App (Node.js + Express) for AWS Deployment

### Run Locally

```bash
npm install
npm start
# open http://localhost:3000
```

### Endpoints

- `/` dynamic EJS view with greeting (`?name=YourName`)
- `/user/:name` dynamic route
- `/api/time` returns JSON with server time
- `/health` health check

### Docker

```bash
docker build -t basic-express-app .
docker run -p 3000:3000 basic-express-app
```

### Deploy to AWS App Runner (Recommended)

**Option 1: From GitHub Repository**
1. Push your code to GitHub
2. Go to AWS App Runner console
3. Create service → Source: GitHub
4. Connect your repository
5. Build settings: Use `apprunner.yaml`
6. Environment variables:
   - `MONGODB_URI`: Your Atlas connection string
   - `NODE_ENV`: `production`
7. Deploy!

**Option 2: From Container Image (ECR)**
1. Build and push to ECR:
   ```bash
   aws ecr create-repository --repository-name basic-express-app
   docker build -t basic-express-app .
   docker tag basic-express-app:latest <account>.dkr.ecr.<region>.amazonaws.com/basic-express-app:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/basic-express-app:latest
   ```
2. Create App Runner service → Source: Container image
3. Select your ECR image
4. Set environment variables (same as above)

### Deploy to AWS Elastic Beanstalk

1. Install EB CLI: `pip install awsebcli`
2. Initialize: `eb init --platform node.js-20 --region ap-south-1`
3. Create environment: `eb create basic-express-env`
4. Set environment variables:
   ```bash
   eb setenv MONGODB_URI="your-atlas-uri" NODE_ENV=production
   ```
5. Deploy: `eb deploy`

### Environment Variables

Set `PORT` if your platform requires; defaults to `3000`.

### MongoDB Atlas Integration

1. Create a free cluster on Atlas.
2. Create a database user and note the username/password.
3. Allow access from 0.0.0.0/0 (or your VPC/App Runner/Beanstalk IPs).
4. Get the Connection String (Driver: Node.js) and set `MONGODB_URI`:

On Windows PowerShell for local runs:
```powershell
$env:MONGODB_URI = "mongodb+srv://USER:PASS@CLUSTER/db?retryWrites=true&w=majority&appName=App"
npm start
```

For Docker/App Runner/Beanstalk, set `MONGODB_URI` as an environment variable in the service configuration.


