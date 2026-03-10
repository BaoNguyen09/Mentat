FROM node:22-slim

WORKDIR /app

COPY package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/types/package.json ./packages/types/package.json

RUN npm install

COPY . .

RUN npm run build --workspace @mentat/api

CMD ["npm", "run", "dev", "--workspace", "@mentat/api"]
