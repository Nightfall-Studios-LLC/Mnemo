#pragma once

#include <QByteArray>
#include <QDateTime>
#include <QList>
#include <QString>
#include <optional>

namespace mnemo::providers {
struct ObjectMetadata {
    QString key;
    qint64 sizeBytes = 0;
    QDateTime modifiedAt;
    QByteArray checksum;
};

enum class ProviderError {
    unavailable,
    authenticationRequired,
    notFound,
    permissionDenied,
    conflict,
    ioError,
    invalidRequest,
};

struct OperationResult {
    bool succeeded = false;
    std::optional<ProviderError> error;
    QString message;
};

// Experimental source-level interface, not a stable binary plugin ABI.
class IStorageProvider {
public:
    virtual ~IStorageProvider() = default;
    [[nodiscard]] virtual QString id() const = 0;
    [[nodiscard]] virtual QString displayName() const = 0;
    [[nodiscard]] virtual bool isAvailable() const = 0;
    virtual OperationResult initialize() = 0;
    virtual OperationResult testConnection() = 0;
    virtual OperationResult upload(const QString& localPath, const QString& remoteKey) = 0;
    virtual OperationResult download(const QString& remoteKey, const QString& localPath) = 0;
    virtual OperationResult remove(const QString& remoteKey) = 0;
    [[nodiscard]] virtual QList<ObjectMetadata> list(const QString& prefix) const = 0;
    [[nodiscard]] virtual bool exists(const QString& remoteKey) const = 0;
    [[nodiscard]] virtual std::optional<ObjectMetadata> metadata(const QString& remoteKey) const = 0;
};
} // namespace mnemo::providers

