FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .
RUN npm run build || true

EXPOSE 3001

CMD ["npm", "start"]
