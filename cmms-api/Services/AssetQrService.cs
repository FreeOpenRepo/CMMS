using QRCoder;

namespace cmms_api.Services;

public interface IAssetQrService
{
    string GenerateAssetQrCodeBase64(int assetId, string assetTag, string name);
}

public class AssetQrService : IAssetQrService
{
    public string GenerateAssetQrCodeBase64(int assetId, string assetTag, string name)
    {
        var payload = $"{{\"system\":\"07_CMMS_ENGINE\",\"assetId\":{assetId},\"tag\":\"{assetTag}\",\"name\":\"{name}\"}}";
        using var qrGenerator = new QRCodeGenerator();
        using var qrCodeData = qrGenerator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        using var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(20);
        return $"data:image/png;base64,{Convert.ToBase64String(qrCodeBytes)}";
    }
}
