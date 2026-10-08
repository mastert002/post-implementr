FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --only=production || npm install --only=production

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
