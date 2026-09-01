#include "app/Application.hpp"

#include "app/AppInfo.hpp"
#include "core/Logging.hpp"
#include "ui/MainWindow.hpp"

#include <QApplication>
#include <QFile>
#include <QIcon>
#include <QStandardPaths>

namespace mnemo {
int Application::run(int argc, char* argv[])
{
    QApplication application(argc, argv);
    QApplication::setApplicationName(app_info::name.toString());
    QApplication::setApplicationDisplayName(app_info::name.toString());
    QApplication::setApplicationVersion(app_info::version.toString());
    QApplication::setOrganizationName(app_info::organization.toString());
    QApplication::setOrganizationDomain(app_info::organizationDomain.toString());

    constexpr auto iconPath = ":/icons/mnemo.svg";
    if (QFile::exists(iconPath)) {
        QApplication::setWindowIcon(QIcon(iconPath));
    }

    qCInfo(logCore) << "Starting Mnemo" << app_info::version;
    qCDebug(logCore) << "Application data location:"
                     << QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    MainWindow window;
    window.show();
    return QApplication::exec();
}
} // namespace mnemo

