// SceneForge — App Entry Point
(function () {
    Canvas.init();
    HotspotEditor.init();
    PlayMode.init();
    Toolbar.init();

    // Auto-load project data if available (for hosted/deployed games)
    if (window.SCENEFORGE_PROJECT) {
        SceneManager.importJSON(window.SCENEFORGE_PROJECT);
        Toolbar.enterPlayMode();
    }
})();
