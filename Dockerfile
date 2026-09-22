FROM node:24-alpine AS frontend-build
WORKDIR /source

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /source

COPY backend/SkillPath.Api/SkillPath.Api.csproj backend/SkillPath.Api/
RUN dotnet restore backend/SkillPath.Api/SkillPath.Api.csproj

COPY backend/SkillPath.Api backend/SkillPath.Api
COPY content content
RUN dotnet publish backend/SkillPath.Api/SkillPath.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /app/publish ./
COPY --from=frontend-build /source/dist ./wwwroot

RUN mkdir -p /app/App_Data \
    && chown -R "$APP_UID":"$APP_UID" /app/App_Data

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
VOLUME ["/app/App_Data"]

USER $APP_UID

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl --fail --silent http://127.0.0.1:8080/api/health > /dev/null || exit 1

ENTRYPOINT ["dotnet", "SkillPath.Api.dll"]
