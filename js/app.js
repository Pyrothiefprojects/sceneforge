// Parallax — App Entry Point
(function () {
    Canvas.init();
    HotspotEditor.init();
    PlayMode.init();
    Toolbar.init();

    // Auto-load project data if available (for hosted/deployed games)
    if (window.PARALLAX_PROJECT) {
        Preloader.run(window.PARALLAX_PROJECT).then(() => {
            SceneManager.importJSON(window.PARALLAX_PROJECT);
            Toolbar.enterPlayMode();
        });
    }
})();
