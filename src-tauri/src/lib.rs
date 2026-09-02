mod commands;
mod models;
mod artwork;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::backup::create_backup,
            commands::restore::restore_backup,
            commands::games::detect_games,
            commands::providers::test_provider,
            commands::persistence::persist_configuration,
            commands::persistence::load_configuration,
            artwork::get_game_artwork,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
