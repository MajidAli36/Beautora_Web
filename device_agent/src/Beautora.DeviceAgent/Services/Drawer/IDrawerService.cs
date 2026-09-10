using Beautora.DeviceAgent.Models.Drawer;

namespace Beautora.DeviceAgent.Services.Drawer;

public interface IDrawerService
{
    Task<IEnumerable<DrawerInfo>> GetDrawersAsync(CancellationToken cancellationToken = default);
    Task<DrawerResult> OpenAsync(string drawerId, CancellationToken cancellationToken = default);
    Task<DrawerStatus> GetStatusAsync(string drawerId, CancellationToken cancellationToken = default);
}
