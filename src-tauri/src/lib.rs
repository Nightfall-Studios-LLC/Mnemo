mod archive;
mod commands;
mod db;
mod minecraft;
mod models;
mod service;

use service::AppService;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .setup(|app| {
            let app_data = app.path().app_data_dir()?;
            let service = AppService::new(app_data).map_err(std::io::Error::other)?;
            service
                .attach(app.handle().clone())
                .map_err(std::io::Error::other)?;
            app.manage::<Arc<AppService>>(service);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::minecraft::get_minecraft_state,
            commands::minecraft::inspect_minecraft_root,
            commands::minecraft::add_minecraft_root,
            commands::minecraft::rescan_minecraft_root,
            commands::minecraft::rename_minecraft_root,
            commands::minecraft::update_minecraft_root_policy,
            commands::minecraft::remove_minecraft_root,
            commands::minecraft::update_minecraft_world_policy,
            commands::minecraft::set_minecraft_world_excluded,
            commands::minecraft::remove_minecraft_world,
            commands::minecraft::backup_minecraft_world,
            commands::minecraft::backup_all_minecraft_worlds,
            commands::minecraft::list_minecraft_snapshots,
            commands::minecraft::verify_minecraft_snapshot,
            commands::minecraft::retry_minecraft_replica,
            commands::minecraft::restore_minecraft_snapshot,
            commands::minecraft::add_storage_destination,
            commands::minecraft::verify_storage_destination,
            commands::minecraft::update_storage_destination,
            commands::minecraft::set_default_storage_destination,
            commands::minecraft::remove_storage_destination,
            commands::minecraft::list_activity,
            commands::minecraft::set_global_settings,
            commands::minecraft::set_minecraft_settings,
            commands::minecraft::get_world_thumbnail,
            commands::minecraft::reveal_persisted_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
