#pragma once
#include <QMainWindow>

class QListWidget;
class QStackedWidget;

namespace mnemo {
class MainWindow final : public QMainWindow {
    Q_OBJECT
public:
    explicit MainWindow(QWidget* parent = nullptr);

private:
    void createShell();
    static QWidget* createPlaceholderPage(const QString& title, const QString& description);
    QListWidget* navigation_ = nullptr;
    QStackedWidget* pages_ = nullptr;
};
} // namespace mnemo

