#include "ui/MainWindow.hpp"

#include "core/Logging.hpp"
#include <QFrame>
#include <QHBoxLayout>
#include <QLabel>
#include <QListWidget>
#include <QStackedWidget>
#include <QVBoxLayout>

namespace mnemo {
MainWindow::MainWindow(QWidget* parent)
    : QMainWindow(parent)
{
    setWindowTitle(tr("Mnemo"));
    resize(1080, 700);
    setMinimumSize(760, 500);
    createShell();
    qCDebug(logUi) << "Main window created";
}

void MainWindow::createShell()
{
    auto* root = new QWidget(this);
    auto* layout = new QHBoxLayout(root);
    layout->setContentsMargins(0, 0, 0, 0);
    layout->setSpacing(0);

    auto* sidebar = new QFrame(root);
    sidebar->setObjectName("sidebar");
    sidebar->setMinimumWidth(190);
    sidebar->setMaximumWidth(240);
    auto* sidebarLayout = new QVBoxLayout(sidebar);
    sidebarLayout->setContentsMargins(20, 28, 20, 20);
    sidebarLayout->setSpacing(20);

    auto* title = new QLabel(tr("Mnemo"), sidebar);
    QFont titleFont = title->font();
    titleFont.setPointSize(18);
    titleFont.setBold(true);
    title->setFont(titleFont);

    navigation_ = new QListWidget(sidebar);
    navigation_->setObjectName("navigation");
    navigation_->setFrameShape(QFrame::NoFrame);
    navigation_->setSpacing(3);
    navigation_->addItems({tr("Library"), tr("Backups"), tr("Providers"), tr("Settings")});
    navigation_->setCurrentRow(0);
    sidebarLayout->addWidget(title);
    sidebarLayout->addWidget(navigation_, 1);

    pages_ = new QStackedWidget(root);
    pages_->addWidget(createPlaceholderPage(tr("Library"), tr("Installed games and discovered saves will appear here.")));
    pages_->addWidget(createPlaceholderPage(tr("Backups"), tr("Backup history will be available here.")));
    pages_->addWidget(createPlaceholderPage(tr("Providers"), tr("Storage providers will be configured here.")));
    pages_->addWidget(createPlaceholderPage(tr("Settings"), tr("Application preferences will be available here.")));
    connect(navigation_, &QListWidget::currentRowChanged, pages_, &QStackedWidget::setCurrentIndex);

    layout->addWidget(sidebar);
    layout->addWidget(pages_, 1);
    setCentralWidget(root);
    setStyleSheet(R"(
        QFrame#sidebar { background: palette(alternate-base); border-right: 1px solid palette(mid); }
        QListWidget#navigation { background: transparent; outline: none; }
        QListWidget#navigation::item { padding: 10px 12px; border-radius: 5px; }
        QListWidget#navigation::item:selected { background: palette(highlight); color: palette(highlighted-text); }
    )");
}

QWidget* MainWindow::createPlaceholderPage(const QString& title, const QString& description)
{
    auto* page = new QWidget;
    auto* layout = new QVBoxLayout(page);
    layout->setContentsMargins(40, 36, 40, 36);
    layout->setSpacing(8);
    auto* heading = new QLabel(title, page);
    QFont headingFont = heading->font();
    headingFont.setPointSize(20);
    headingFont.setBold(true);
    heading->setFont(headingFont);
    auto* detail = new QLabel(description, page);
    detail->setWordWrap(true);
    detail->setStyleSheet("color: palette(mid);");
    layout->addWidget(heading);
    layout->addWidget(detail);
    layout->addStretch();
    return page;
}
} // namespace mnemo

