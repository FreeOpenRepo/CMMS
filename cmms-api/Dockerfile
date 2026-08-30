# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["cmms-api.csproj", "./"]
RUN dotnet restore "cmms-api.csproj"

COPY . .
RUN dotnet publish "cmms-api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://0.0.0.0:5020
ENV ASPNETCORE_HTTP_PORTS=5020
EXPOSE 5020
ENTRYPOINT ["dotnet", "cmms-api.dll"]

