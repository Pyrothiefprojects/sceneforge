// Parallax — App Entry Point
(function () {
    Canvas.init();
    HotspotEditor.init();
    PlayMode.init();
    Toolbar.init();

    // TODO: Remove — dev convenience: open puzzle section with ideogram editor on startup
    Toolbar.openSection('puzzle');
    const ideogramToggle = document.getElementById('ideogram-toggle');
    if (ideogramToggle) ideogramToggle.click();

    // Auto-load project data if available (for hosted/deployed games)
    if (window.PARALLAX_PROJECT) {
        Preloader.run(window.PARALLAX_PROJECT).then(() => {
            SceneManager.importJSON(window.PARALLAX_PROJECT);
            Toolbar.enterPlayMode();
        });
    }
})();
