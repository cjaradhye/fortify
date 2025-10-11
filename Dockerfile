# Backend (server)
FROM node:20 AS server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ ./

# Frontend (client)
FROM node:20 AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./

# ML Model (model)
FROM python:3.10 AS model
WORKDIR /app/model
COPY model/requirements.txt ./
RUN pip install -r requirements.txt
COPY model/ ./

# Final image (multi-stage, example for backend)
FROM node:20 AS final
WORKDIR /app/server
COPY --from=server /app/server .
EXPOSE 3001
CMD ["node", "server.js"]
