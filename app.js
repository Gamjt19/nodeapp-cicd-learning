const http = require("http");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Project 49 - CI/CD Pipeline is working!\n");
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});