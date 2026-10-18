# Stage 1: Build & Publish
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files for caching layer
COPY ["Orbit.slnx", "./"]
COPY ["src/Orbit.Domain/Orbit.Domain.csproj", "src/Orbit.Domain/"]
COPY ["src/Orbit.Application/Orbit.Application.csproj", "src/Orbit.Application/"]
COPY ["src/Orbit.Infrastructure/Orbit.Infrastructure.csproj", "src/Orbit.Infrastructure/"]
COPY ["src/Orbit.Api/Orbit.Api.csproj", "src/Orbit.Api/"]
COPY ["tests/Orbit.Tests/Orbit.Tests.csproj", "tests/Orbit.Tests/"]

# Restore dependencies
RUN dotnet restore "Orbit.slnx"

# Copy remaining source code
COPY . .

# Run test suite in build container to guard deployment
RUN dotnet test "tests/Orbit.Tests/Orbit.Tests.csproj" --no-restore --nologo -c Release

# Publish API
RUN dotnet publish "src/Orbit.Api/Orbit.Api.csproj" -c Release -o /app/publish --no-restore

# Stage 2: Final Production Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Orbit.Api.dll"]
