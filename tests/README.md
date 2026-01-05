# Load Testing for Edunox

This folder contains load testing scripts to simulate multiple students marking attendance concurrently.

## Prerequisites

1. Make sure your development server is running:
   ```bash
   npm run dev
   ```

2. Create an active attendance session as a professor

## Available Tests

### 1. Direct Database Load Test (`load-test.ts`)

This test directly writes to the database, bypassing HTTP. Useful for testing pure database performance.

```bash
npx ts-node tests/load-test.ts
```

### 2. HTTP-Based Load Test (`load-test-http.ts`)

This test makes real HTTP requests, simulating actual student behavior. More realistic but slower.

```bash
npx ts-node tests/load-test-http.ts
```

## Configuration

You can configure the tests using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `TEST_NUM_STUDENTS` | 100 | Number of test students to simulate |
| `TEST_BASE_URL` | http://localhost:3000 | Server URL |

Example:
```bash
TEST_NUM_STUDENTS=50 npx ts-node tests/load-test.ts
```

## What the Tests Do

1. **Create test students** - Creates fake student accounts (`teststudent1@loadtest.local`, etc.)
2. **Find active session** - Uses the currently active attendance session
3. **Clean up** - Removes any previous test attendance records
4. **Run concurrent requests** - Simulates all students marking attendance at once
5. **Report results** - Shows success rate, response times, throughput

## Sample Output

```
╔════════════════════════════════════════════════════════════╗
║           ATTENDANCE SYSTEM LOAD TEST                      ║
╚════════════════════════════════════════════════════════════╝

📊 Summary:
   Total requests:     100
   Successful:         100 (100.0%)
   Failed:             0 (0.0%)
   Total time:         1234ms
   Throughput:         81.0 req/sec

⏱️  Response Times:
   Min:                5ms
   Max:                45ms
   Average:            12.3ms
   Median (p50):       10ms
   p95:                25ms
   p99:                40ms
```

## Cleanup

Test students are created with email pattern `teststudent*@loadtest.local`. 
To remove them:

```sql
DELETE FROM users WHERE email LIKE 'teststudent%@loadtest.local';
```

Or use Prisma:
```bash
npx prisma studio
```
Then manually delete the test users.

