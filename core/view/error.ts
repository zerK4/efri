export const errorPageHTML = (error: Error, status: number = 500) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error ${status}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: #f7f7f7;
        }
        .error-container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            max-width: 90%;
            width: 600px;
        }
        .error-code {
            font-size: 4rem;
            color: #e53e3e;
            margin: 0;
        }
        .error-message {
            color: #4a5568;
            margin-top: 1rem;
        }
        .error-stack {
            margin-top: 2rem;
            padding: 1rem;
            background: #f1f5f9;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            font-size: 0.875rem;
            color: #64748b;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <h1 class="error-code">${status}</h1>
        <div class="error-message">
            <h2>${error.message || 'An error occurred'}</h2>
            ${status === 404 ? 'The requested resource could not be found.' : 'Something went wrong while processing your request.'}
        </div>
        ${
          process.env.NODE_ENV === 'development'
            ? `
            <pre class="error-stack">${error.stack || 'No stack trace available'}</pre>
        `
            : ''
        }
    </div>
</body>
</html>
`;
