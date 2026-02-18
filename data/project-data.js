window.SCENEFORGE_PROJECT = {
  "scenes": [
    {
      "id": "cryooperations_1771308338532",
      "name": "cryooperations",
      "states": [
        {
          "background": "cryooperations.png",
          "backgroundData": "assets/scenes/cryooperations.png",
          "hotspots": [
            {
              "id": "hotspot_1771315434579",
              "name": "",
              "points": [
                [
                  892,
                  381
                ],
                [
                  873,
                  472
                ],
                [
                  1096,
                  500
                ],
                [
                  1109,
                  392
                ]
              ],
              "action": {
                "type": "puzzle",
                "puzzleId": "puzzle_1771315415317"
              },
              "requires": []
            }
          ]
        }
      ],
      "editingStateIndex": 0,
      "music": null,
      "sceneAssets": [],
      "hotspotConnections": []
    },
    {
      "id": "cryo_1771308332754",
      "name": "cryo",
      "states": [
        {
          "background": "cryo.png",
          "backgroundData": "assets/scenes/cryo.png",
          "hotspots": []
        }
      ],
      "editingStateIndex": 0,
      "music": null,
      "sceneAssets": [],
      "hotspotConnections": []
    },
    {
      "id": "loadingbay_1771308338532",
      "name": "loadingbay",
      "states": [
        {
          "background": "loadingbay.png",
          "backgroundData": "assets/scenes/loadingbay.png",
          "hotspots": []
        }
      ],
      "editingStateIndex": 0,
      "music": null,
      "sceneAssets": [],
      "hotspotConnections": []
    }
  ],
  "items": [
    {
      "id": "spin_dial_1771308660868",
      "name": "Spin Dial",
      "image": "assets/items/spindial.png",
      "uses": 1
    },
    {
      "id": "isomarked_plate_1771308671605",
      "name": "IsoMarked Plate",
      "image": "assets/items/isomarkedplate.png",
      "uses": 1
    },
    {
      "id": "lock_pin_1771308683540",
      "name": "Lock Pin",
      "image": "assets/items/lockpin.png",
      "uses": 1
    },
    {
      "id": "glowsticks_1771313874210",
      "name": "Glowsticks",
      "image": null,
      "uses": 1
    }
  ],
  "puzzles": [
    {
      "id": "puzzle_1771308372319",
      "name": "Cryo Facility Window",
      "states": [
        {
          "backgroundImage": "assets/puzzles/cryofacility2.png",
          "assets": [],
          "assetGroups": [],
          "hotspots": []
        }
      ],
      "editingStateIndex": 0,
      "rewardItemId": "",
      "rewardSceneState": null,
      "isClue": false,
      "completionText": ""
    },
    {
      "id": "puzzle_1771308404837",
      "name": "Cryo Lockers",
      "states": [
        {
          "backgroundImage": "assets/puzzles/lockers.png",
          "assets": [],
          "assetGroups": [],
          "hotspots": []
        }
      ],
      "editingStateIndex": 0,
      "rewardItemId": "",
      "rewardSceneState": null,
      "isClue": false,
      "completionText": ""
    },
    {
      "id": "puzzle_1771315415317",
      "name": "Map",
      "states": [
        {
          "backgroundImage": "assets/puzzles/diagramperfectcircle.png",
          "assets": [],
          "assetGroups": [],
          "hotspots": []
        }
      ],
      "editingStateIndex": 0,
      "rewardItemId": "",
      "rewardSceneState": null,
      "isClue": false,
      "completionText": ""
    }
  ],
  "gameState": [],
  "progressionSteps": [],
  "blueprint": {
    "elements": [
      {
        "id": "bp_element_1771308748927_u8tv",
        "type": "room",
        "x": 600,
        "y": 280,
        "width": 600,
        "height": 480,
        "label": "Loading Bat",
        "color": "#ffffff",
        "sceneId": "loadingbay_1771308338532"
      },
      {
        "id": "bp_element_1771308844609_2ls0",
        "type": "room",
        "x": 1240,
        "y": 280,
        "width": 240,
        "height": 200,
        "label": "Operations",
        "color": "#ffffff",
        "sceneId": "cryooperations_1771308338532"
      },
      {
        "id": "bp_element_1771308855951_9i80",
        "type": "door",
        "x": 1200,
        "y": 400,
        "width": 40,
        "height": 80,
        "label": "",
        "color": "rgba(128, 128, 128, 0.5)",
        "fromRoom": null,
        "toRoom": null,
        "description": "",
        "puzzleId": null,
        "sceneId": null
      },
      {
        "id": "bp_element_1771308890476_j1cm",
        "type": "door",
        "x": 1200,
        "y": 520,
        "width": 40,
        "height": 80,
        "label": "",
        "color": "rgba(128, 128, 128, 0.5)",
        "fromRoom": null,
        "toRoom": null,
        "description": "",
        "puzzleId": null,
        "sceneId": null
      },
      {
        "id": "bp_element_1771308901947_s8jm",
        "type": "door",
        "x": 560,
        "y": 520,
        "width": 40,
        "height": 80,
        "label": "",
        "color": "rgba(128, 128, 128, 0.5)",
        "fromRoom": null,
        "toRoom": null,
        "description": "",
        "puzzleId": null,
        "sceneId": null
      },
      {
        "id": "bp_element_1771308929526_7zbr",
        "type": "room",
        "x": 280,
        "y": 280,
        "width": 280,
        "height": 400,
        "label": "Cryo Last Stand",
        "color": "#ffffff",
        "sceneId": "cryo_1771308332754"
      },
      {
        "id": "bp_element_1771308933642_n9w0",
        "type": "asset",
        "x": 480,
        "y": 600,
        "width": 40,
        "height": 80,
        "label": "?? Pod",
        "color": "#999999",
        "assetId": null,
        "puzzleId": null
      },
      {
        "id": "bp_element_1771308935088_wxc3",
        "type": "asset",
        "x": 400,
        "y": 600,
        "width": 40,
        "height": 80,
        "label": "? Pod",
        "color": "#999999",
        "assetId": null,
        "puzzleId": null
      },
      {
        "id": "bp_element_1771308936522_e70t",
        "type": "asset",
        "x": 320,
        "y": 600,
        "width": 40,
        "height": 80,
        "label": "Player Pod",
        "color": "#999999",
        "assetId": null,
        "puzzleId": null
      },
      {
        "id": "bp_element_1771309056617_vcbz",
        "type": "window",
        "x": 1280,
        "y": 240,
        "width": 160,
        "height": 40,
        "label": "Cryo Facility",
        "color": "#cccccc",
        "description": "",
        "puzzleId": "puzzle_1771308372319",
        "sceneId": null
      },
      {
        "id": "bp_element_1771309096372_mis1",
        "type": "door",
        "x": 720,
        "y": 240,
        "width": 360,
        "height": 40,
        "label": "",
        "color": "rgba(128, 128, 128, 0.5)",
        "fromRoom": null,
        "toRoom": null,
        "description": "",
        "puzzleId": null,
        "sceneId": null
      },
      {
        "id": "bp_element_1771309156269_z2bx",
        "type": "perspective",
        "x": 320,
        "y": 360,
        "width": 40,
        "height": 40,
        "label": "",
        "color": "#ffffff"
      },
      {
        "id": "bp_element_1771309164589_lxy4",
        "type": "perspective",
        "x": 880,
        "y": 720,
        "width": 40,
        "height": 40,
        "label": "",
        "color": "#ffffff"
      },
      {
        "id": "bp_element_1771309175535_qiz3",
        "type": "perspective",
        "x": 1240,
        "y": 400,
        "width": 40,
        "height": 40,
        "label": "",
        "color": "#ffffff"
      },
      {
        "id": "bp_element_1771309268834_ku67",
        "type": "item",
        "x": 520,
        "y": 440,
        "width": 40,
        "height": 40,
        "label": "Spin Dial",
        "color": "#ff6b35",
        "itemId": "spin_dial_1771308660868"
      },
      {
        "id": "bp_element_1771309270634_j3ep",
        "type": "item",
        "x": 1320,
        "y": 280,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate (Cryo)",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771309271922_wxy3",
        "type": "item",
        "x": 1440,
        "y": 840,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771309273138_7wtl",
        "type": "item",
        "x": 1000,
        "y": 880,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771309274305_o6x2",
        "type": "item",
        "x": 920,
        "y": 880,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771309275534_zk0c",
        "type": "item",
        "x": 320,
        "y": 320,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate (navigation)",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771309277734_ninj",
        "type": "item",
        "x": 1040,
        "y": 280,
        "width": 40,
        "height": 40,
        "label": "Lock Pin",
        "color": "#ff6b35",
        "itemId": "lock_pin_1771308683540"
      },
      {
        "id": "bp_element_1771309279125_tmgt",
        "type": "item",
        "x": 720,
        "y": 280,
        "width": 40,
        "height": 40,
        "label": "Lock Pin",
        "color": "#ff6b35",
        "itemId": "lock_pin_1771308683540"
      },
      {
        "id": "bp_element_1771309802263_flmy",
        "type": "window",
        "x": 280,
        "y": 320,
        "width": 40,
        "height": 120,
        "label": "Lockers",
        "color": "#cccccc",
        "description": "There are 3 lockers, one for each cryo pod. To open your cryopod you need your spin dial. Your locker contains an IsoMarked Ruin (also a plate)",
        "puzzleId": "puzzle_1771308404837",
        "sceneId": null
      },
      {
        "id": "bp_element_1771310445082_a0rl",
        "type": "item",
        "x": 320,
        "y": 560,
        "width": 40,
        "height": 40,
        "label": "IsoMarked SpinDial ID Plate",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      },
      {
        "id": "bp_element_1771311958773_4jws",
        "type": "asset",
        "x": 520,
        "y": 480,
        "width": 40,
        "height": 40,
        "label": "Spin Dial Supplier",
        "color": "#999999",
        "assetId": null,
        "puzzleId": null
      },
      {
        "id": "bp_element_1771313213126_1o7k",
        "type": "room",
        "x": 1240,
        "y": 520,
        "width": 120,
        "height": 120,
        "label": "Cyro Power Shaft",
        "color": "#ffffff",
        "sceneId": null
      },
      {
        "id": "bp_element_1771313881505_p9m2",
        "type": "item",
        "x": 1160,
        "y": 320,
        "width": 40,
        "height": 40,
        "label": "Glowsticks",
        "color": "#ff6b35",
        "itemId": "glowsticks_1771313874210"
      },
      {
        "id": "bp_element_1771315164692_jmxe",
        "type": "door",
        "x": 1360,
        "y": 520,
        "width": 40,
        "height": 40,
        "label": "Shaft",
        "color": "rgba(128, 128, 128, 0.5)",
        "fromRoom": null,
        "toRoom": null,
        "description": "A shaft leading down to the power room, it has a large industrial lid.",
        "puzzleId": null,
        "sceneId": null
      },
      {
        "id": "bp_element_1771315278187_oxwj",
        "type": "room",
        "x": 1400,
        "y": 520,
        "width": 360,
        "height": 480,
        "label": "Cryo Power Generator",
        "color": "#ffffff",
        "sceneId": null
      },
      {
        "id": "bp_element_1771316829376_fr6q",
        "type": "asset",
        "x": 600,
        "y": 360,
        "width": 40,
        "height": 80,
        "label": "IsoMark Plate Press",
        "color": "#999999",
        "assetId": null,
        "puzzleId": null
      },
      {
        "id": "bp_element_1771316876142_pmmo",
        "type": "item",
        "x": 600,
        "y": 440,
        "width": 40,
        "height": 40,
        "label": "IsoMarked Plate (System level - Generator)",
        "color": "#ff6b35",
        "itemId": "isomarked_plate_1771308671605"
      }
    ],
    "viewport": {
      "offsetX": 0,
      "offsetY": 0,
      "zoom": 1
    },
    "metadata": {
      "created": 1771308000000,
      "modified": 1771412927336
    }
  },
  "ideogramData": {
    "ruinLibrary": [
      {
        "id": "ruin_1771390145259_3nq5",
        "name": "Diagramperfectcircle",
        "image": "assets/puzzles/diagramperfectcircle.png"
      },
      {
        "id": "ruin_1771390288998_5sea",
        "name": "Cryo",
        "image": "assets/puzzles/ruin_cryo.png"
      },
      {
        "id": "ruin_1771390288999_sxwv",
        "name": "Navigation",
        "image": "assets/puzzles/ruin_navigation.png"
      },
      {
        "id": "ruin_1771390289000_vn8u",
        "name": "Shield",
        "image": "assets/puzzles/ruin_shield.png"
      },
      {
        "id": "ruin_1771390289000_x53l",
        "name": "Weapons",
        "image": "assets/puzzles/ruin_weapons.png"
      },
      {
        "id": "ruin_1771392128860_kjkp",
        "name": "Engine",
        "image": "assets/puzzles/ruin_engine.png"
      }
    ],
    "ideograms": []
  }
};
