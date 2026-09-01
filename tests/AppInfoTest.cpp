#include "app/AppInfo.hpp"
#include <QTest>

class AppInfoTest final : public QObject {
    Q_OBJECT
private slots:
    void metadataIsDefined()
    {
        QVERIFY(!mnemo::app_info::name.isEmpty());
        QVERIFY(!mnemo::app_info::organization.isEmpty());
        QVERIFY(mnemo::app_info::version.endsWith(u"-dev"));
    }
};
QTEST_APPLESS_MAIN(AppInfoTest)
#include "AppInfoTest.moc"

