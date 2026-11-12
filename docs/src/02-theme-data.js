    // ══════════════════════════════════════════════════════════════════════════
    // 主题数据（62 套，由 docs/_extract_themes.mjs 从 dsh-opencode-palette 2.1.12 提取）
    //
    // 37 套内置主题：{ defs: {色名→hex}, theme: {角色→{dark,light}} }
    // 25 套 IP 预置：{ appearance, basePreset, colors:{37槽}, id, name, schema, updatedAt }
    //
    // 角色值可以是 hex、defs 里的色名、theme 里别的角色名（引用链），或 "transparent"。
    // background / backgroundPanel / backgroundElement 为 "transparent" 的主题
    // 即「透光」系（透光橙），画布交给宿主，壁纸能透出来。
    //
    // 这一段是纯数据，不含逻辑。改主题请改数据，别在这里加分支。
    // 体量约 200KB —— 换来 62 套完整配色（含 Markdown 语义色与语法高亮色），
    // 是「以调色板功能为主」的核心资产。
    // ══════════════════════════════════════════════════════════════════════════

    // —— 37 套内置主题 ——
    const amoled = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#000000",
      "light": "#F0F0F0"
    },
    "backgroundPanel": {
      "dark": "#121212",
      "light": "#E0E0E0"
    },
    "backgroundElement": {
      "dark": "#242424",
      "light": "#D0D0D0"
    },
    "text": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "textMuted": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "primary": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "secondary": {
      "dark": "#FF4081",
      "light": "#F8007C"
    },
    "accent": {
      "dark": "#FF4081",
      "light": "#FF0080"
    },
    "error": {
      "dark": "#FF1744",
      "light": "#FA1743"
    },
    "warning": {
      "dark": "#FFEA00",
      "light": "#AD7400"
    },
    "success": {
      "dark": "#00FF88",
      "light": "#00934B"
    },
    "info": {
      "dark": "#18FFFF",
      "light": "#0087C4"
    },
    "border": {
      "dark": "#D6D6D6",
      "light": "#2F2F2F"
    },
    "borderActive": {
      "dark": "#ADADAD",
      "light": "#545454"
    },
    "syntaxComment": {
      "dark": "#7D7D7D",
      "light": "#636363"
    },
    "syntaxKeyword": {
      "dark": "#FF00FF",
      "light": "#AA00C7"
    },
    "syntaxFunction": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "syntaxVariable": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "syntaxString": {
      "dark": "#00FF88",
      "light": "#00733B"
    },
    "syntaxNumber": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "syntaxType": {
      "dark": "#18FFFF",
      "light": "#006A9A"
    },
    "syntaxOperator": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "markdownLink": {
      "dark": "#FF4081",
      "light": "#C40062"
    },
    "markdownHeading": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownCode": {
      "dark": "#B388FF",
      "light": "#6200FF"
    },
    "markdownEmph": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownStrong": {
      "dark": "#FFFFFF",
      "light": "#0A0A0A"
    },
    "markdownBlockQuote": {
      "dark": "#A5A5A5",
      "light": "#3B3B3B"
    },
    "markdownHorizontalRule": {
      "dark": "#D6D6D6",
      "light": "#2F2F2F"
    },
    "diffAdded": {
      "dark": "#00FF88",
      "light": "#00E676"
    },
    "diffRemoved": {
      "dark": "#FF1744",
      "light": "#FF1744"
    },
    "diffAddedBg": {
      "dark": "#00381E",
      "light": "#CEEFDF"
    },
    "diffRemovedBg": {
      "dark": "#38050F",
      "light": "#F2D2D8"
    },
    "diffAddedLineNumberBg": {
      "dark": "#00381E",
      "light": "#CEEFDF"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#38050F",
      "light": "#F2D2D8"
    }
      }
    };
    const aura = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0f0f0f",
    "darkBgPanel": "#15141b",
    "darkBorder": "#2d2d2d",
    "darkFgMuted": "#989898",
    "darkFg": "#edecee",
    "purple": "#A77FFF",
    "pink": "#f694ff",
    "blue": "#82e2ff",
    "red": "#ff6767",
    "orange": "#ffca85",
    "cyan": "#61ffca",
    "green": "#9dff65"
      },
      "theme": {
    "primary": "purple",
    "secondary": "pink",
    "accent": "purple",
    "error": "red",
    "warning": "orange",
    "success": "cyan",
    "info": "purple",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkBgPanel",
    "backgroundElement": "darkBgPanel",
    "border": "darkBorder",
    "borderActive": "darkFgMuted",
    "borderSubtle": "darkBorder",
    "diffAdded": "cyan",
    "diffRemoved": "red",
    "diffContext": "darkFgMuted",
    "diffHunkHeader": "darkFgMuted",
    "diffHighlightAdded": "cyan",
    "diffHighlightRemoved": "red",
    "diffAddedBg": "#354933",
    "diffRemovedBg": "#3f191a",
    "diffContextBg": "darkBgPanel",
    "diffLineNumber": "#898989",
    "diffAddedLineNumberBg": "#162620",
    "diffRemovedLineNumberBg": "#26161a",
    "markdownText": "darkFg",
    "markdownHeading": "purple",
    "markdownLink": "pink",
    "markdownLinkText": "purple",
    "markdownCode": "cyan",
    "markdownBlockQuote": "darkFgMuted",
    "markdownEmph": "orange",
    "markdownStrong": "purple",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "purple",
    "markdownListEnumeration": "purple",
    "markdownImage": "pink",
    "markdownImageText": "purple",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkFgMuted",
    "syntaxKeyword": "pink",
    "syntaxFunction": "purple",
    "syntaxVariable": "purple",
    "syntaxString": "cyan",
    "syntaxNumber": "green",
    "syntaxType": "purple",
    "syntaxOperator": "pink",
    "syntaxPunctuation": "darkFg"
      }
    };
    const ayu = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0B0E14",
    "darkBgAlt": "#0D1017",
    "darkLine": "#11151C",
    "darkPanel": "#0F131A",
    "darkFg": "#BFBDB6",
    "darkFgMuted": "#94979E",
    "darkGutter": "#6C7380",
    "darkTag": "#39BAE6",
    "darkFunc": "#FFB454",
    "darkEntity": "#59C2FF",
    "darkString": "#AAD94C",
    "darkRegexp": "#95E6CB",
    "darkMarkup": "#F07178",
    "darkKeyword": "#FF8F40",
    "darkSpecial": "#E6B673",
    "darkComment": "#ACB6BF",
    "darkConstant": "#D2A6FF",
    "darkOperator": "#F29668",
    "darkAdded": "#7FD962",
    "darkRemoved": "#F26D78",
    "darkAccent": "#E6B450",
    "darkError": "#D95757",
    "darkIndentActive": "#6C7380"
      },
      "theme": {
    "primary": "darkEntity",
    "secondary": "darkConstant",
    "accent": "darkAccent",
    "error": "darkError",
    "warning": "darkSpecial",
    "success": "darkAdded",
    "info": "darkTag",
    "text": "darkFg",
    "textMuted": "darkFgMuted",
    "background": "darkBg",
    "backgroundPanel": "darkPanel",
    "backgroundElement": "darkBgAlt",
    "border": "darkGutter",
    "borderActive": "darkIndentActive",
    "borderSubtle": "darkLine",
    "diffAdded": "darkAdded",
    "diffRemoved": "darkRemoved",
    "diffContext": "darkComment",
    "diffHunkHeader": "darkComment",
    "diffHighlightAdded": "darkString",
    "diffHighlightRemoved": "darkMarkup",
    "diffAddedBg": "#20303b",
    "diffRemovedBg": "#37222c",
    "diffContextBg": "darkPanel",
    "diffLineNumber": "diffContext",
    "diffAddedLineNumberBg": "#1b2b34",
    "diffRemovedLineNumberBg": "#2d1f26",
    "markdownText": "darkFg",
    "markdownHeading": "darkConstant",
    "markdownLink": "darkEntity",
    "markdownLinkText": "darkTag",
    "markdownCode": "darkString",
    "markdownBlockQuote": "darkSpecial",
    "markdownEmph": "darkSpecial",
    "markdownStrong": "darkFunc",
    "markdownHorizontalRule": "darkFgMuted",
    "markdownListItem": "darkEntity",
    "markdownListEnumeration": "darkTag",
    "markdownImage": "darkEntity",
    "markdownImageText": "darkTag",
    "markdownCodeBlock": "darkFg",
    "syntaxComment": "darkComment",
    "syntaxKeyword": "darkKeyword",
    "syntaxFunction": "darkFunc",
    "syntaxVariable": "darkEntity",
    "syntaxString": "darkString",
    "syntaxNumber": "darkConstant",
    "syntaxType": "darkSpecial",
    "syntaxOperator": "darkOperator",
    "syntaxPunctuation": "darkFg"
      }
    };
    const carbonfox = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "bg0": "#0d0d0d",
    "bg1": "#161616",
    "bg1a": "#1a1a1a",
    "bg2": "#1e1e1e",
    "bg3": "#262626",
    "bg4": "#303030",
    "fg0": "#ffffff",
    "fg1": "#f2f4f8",
    "fg2": "#a9afbc",
    "fg3": "#9AA0A8",
    "lbg0": "#ffffff",
    "lbg1": "#f4f4f4",
    "lbg2": "#e8e8e8",
    "lbg3": "#dcdcdc",
    "lfg0": "#000000",
    "lfg1": "#161616",
    "lfg2": "#525252",
    "lfg3": "#6f6f6f",
    "red": "#ee5396",
    "green": "#25be6a",
    "yellow": "#08bdba",
    "blue": "#78a9ff",
    "magenta": "#be95ff",
    "cyan": "#3CB5FF",
    "white": "#dfdfe0",
    "orange": "#3ddbd9",
    "pink": "#ff7eb6",
    "blueBright": "#8cb6ff",
    "cyanBright": "#52c7ff",
    "greenBright": "#46c880",
    "redLight": "#9f1853",
    "greenLight": "#198038",
    "yellowLight": "#007d79",
    "blueLight": "#0043ce",
    "magentaLight": "#6929c4",
    "cyanLight": "#0072c3",
    "warning": "#f1c21b",
    "diffGreen": "#50fa7b",
    "diffRed": "#ff6b6b",
    "diffGreenBg": "#0f2418",
    "diffRedBg": "#2a1216"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "secondary": {
      "dark": "blue",
      "light": "blueLight"
    },
    "accent": {
      "dark": "pink",
      "light": "redLight"
    },
    "error": {
      "dark": "red",
      "light": "redLight"
    },
    "warning": {
      "dark": "warning",
      "light": "yellowLight"
    },
    "success": {
      "dark": "green",
      "light": "greenLight"
    },
    "info": {
      "dark": "blue",
      "light": "blueLight"
    },
    "text": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "textMuted": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "background": {
      "dark": "bg1",
      "light": "lbg0"
    },
    "backgroundPanel": {
      "dark": "bg1a",
      "light": "lbg1"
    },
    "backgroundElement": {
      "dark": "bg2",
      "light": "lbg1"
    },
    "border": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blueLight"
    },
    "borderSubtle": {
      "dark": "bg3",
      "light": "lbg2"
    },
    "diffAdded": {
      "dark": "diffGreen",
      "light": "greenLight"
    },
    "diffRemoved": {
      "dark": "diffRed",
      "light": "redLight"
    },
    "diffContext": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "diffHunkHeader": {
      "dark": "blue",
      "light": "blueLight"
    },
    "diffHighlightAdded": {
      "dark": "#7dffaa",
      "light": "greenLight"
    },
    "diffHighlightRemoved": {
      "dark": "#ff9999",
      "light": "redLight"
    },
    "diffAddedBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "diffContextBg": {
      "dark": "bg1",
      "light": "lbg1"
    },
    "diffLineNumber": {
      "dark": "#808792",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "diffGreenBg",
      "light": "#defbe6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "diffRedBg",
      "light": "#fff1f1"
    },
    "markdownText": {
      "dark": "fg1",
      "light": "lfg1"
    },
    "markdownHeading": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCode": {
      "dark": "green",
      "light": "greenLight"
    },
    "markdownBlockQuote": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "markdownEmph": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "markdownStrong": {
      "dark": "fg0",
      "light": "lfg0"
    },
    "markdownHorizontalRule": {
      "dark": "bg4",
      "light": "lbg3"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "blueLight"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "cyanLight"
    },
    "markdownCodeBlock": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxComment": {
      "dark": "fg3",
      "light": "lfg3"
    },
    "syntaxKeyword": {
      "dark": "magenta",
      "light": "magentaLight"
    },
    "syntaxFunction": {
      "dark": "blueBright",
      "light": "blueLight"
    },
    "syntaxVariable": {
      "dark": "white",
      "light": "lfg1"
    },
    "syntaxString": {
      "dark": "green",
      "light": "greenLight"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "yellowLight"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellowLight"
    },
    "syntaxOperator": {
      "dark": "fg2",
      "light": "lfg2"
    },
    "syntaxPunctuation": {
      "dark": "fg2",
      "light": "lfg1"
    }
      }
    };
    const catppuccin_frappe = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "frappeRosewater": "#f2d5cf",
    "frappeFlamingo": "#eebebe",
    "frappePink": "#f4b8e4",
    "frappeMauve": "#ca9ee6",
    "frappeRed": "#e78284",
    "frappeMaroon": "#ea999c",
    "frappePeach": "#ef9f76",
    "frappeYellow": "#e5c890",
    "frappeGreen": "#a6d189",
    "frappeTeal": "#81c8be",
    "frappeSky": "#99d1db",
    "frappeSapphire": "#85c1dc",
    "frappeBlue": "#8da4e2",
    "frappeLavender": "#babbf1",
    "frappeText": "#c6d0f5",
    "frappeSubtext1": "#b5bfe2",
    "frappeSubtext0": "#a5adce",
    "frappeOverlay2": "#B0B6CA",
    "frappeOverlay1": "#838ba7",
    "frappeOverlay0": "#737994",
    "frappeSurface2": "#626880",
    "frappeSurface1": "#787D8E",
    "frappeSurface0": "#414559",
    "frappeBase": "#303446",
    "frappeMantle": "#292c3c",
    "frappeCrust": "#232634"
      },
      "theme": {
    "primary": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "secondary": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "accent": {
      "dark": "frappePink",
      "light": "frappePink"
    },
    "error": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "warning": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "success": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "info": {
      "dark": "frappeTeal",
      "light": "frappeTeal"
    },
    "text": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "textMuted": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "background": {
      "dark": "frappeBase",
      "light": "frappeBase"
    },
    "backgroundPanel": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "backgroundElement": {
      "dark": "frappeCrust",
      "light": "frappeCrust"
    },
    "border": {
      "dark": "frappeSurface0",
      "light": "frappeSurface0"
    },
    "borderActive": {
      "dark": "frappeSurface1",
      "light": "frappeSurface1"
    },
    "borderSubtle": {
      "dark": "frappeSurface2",
      "light": "frappeSurface2"
    },
    "diffAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffContext": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "diffHunkHeader": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "diffHighlightAdded": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "diffHighlightRemoved": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "frappeMantle",
      "light": "frappeMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "markdownHeading": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "markdownLink": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownLinkText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCode": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "markdownBlockQuote": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownEmph": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "markdownStrong": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "markdownHorizontalRule": {
      "dark": "frappeSubtext0",
      "light": "frappeSubtext0"
    },
    "markdownListItem": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownListEnumeration": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownImage": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "markdownImageText": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "markdownCodeBlock": {
      "dark": "frappeText",
      "light": "frappeText"
    },
    "syntaxComment": {
      "dark": "frappeOverlay2",
      "light": "frappeOverlay2"
    },
    "syntaxKeyword": {
      "dark": "frappeMauve",
      "light": "frappeMauve"
    },
    "syntaxFunction": {
      "dark": "frappeBlue",
      "light": "frappeBlue"
    },
    "syntaxVariable": {
      "dark": "frappeRed",
      "light": "frappeRed"
    },
    "syntaxString": {
      "dark": "frappeGreen",
      "light": "frappeGreen"
    },
    "syntaxNumber": {
      "dark": "frappePeach",
      "light": "frappePeach"
    },
    "syntaxType": {
      "dark": "frappeYellow",
      "light": "frappeYellow"
    },
    "syntaxOperator": {
      "dark": "frappeSky",
      "light": "frappeSky"
    },
    "syntaxPunctuation": {
      "dark": "frappeText",
      "light": "frappeText"
    }
      }
    };
    const catppuccin_macchiato = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "macRosewater": "#f4dbd6",
    "macFlamingo": "#f0c6c6",
    "macPink": "#f5bde6",
    "macMauve": "#c6a0f6",
    "macRed": "#ed8796",
    "macMaroon": "#ee99a0",
    "macPeach": "#f5a97f",
    "macYellow": "#eed49f",
    "macGreen": "#a6da95",
    "macTeal": "#8bd5ca",
    "macSky": "#91d7e3",
    "macSapphire": "#7dc4e4",
    "macBlue": "#8aadf4",
    "macLavender": "#b7bdf8",
    "macText": "#cad3f5",
    "macSubtext1": "#b8c0e0",
    "macSubtext0": "#a5adcb",
    "macOverlay2": "#A1A8C1",
    "macOverlay1": "#8087a2",
    "macOverlay0": "#6e738d",
    "macSurface2": "#5b6078",
    "macSurface1": "#6D7082",
    "macSurface0": "#363a4f",
    "macBase": "#24273a",
    "macMantle": "#1e2030",
    "macCrust": "#181926"
      },
      "theme": {
    "primary": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "secondary": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "accent": {
      "dark": "macPink",
      "light": "macPink"
    },
    "error": {
      "dark": "macRed",
      "light": "macRed"
    },
    "warning": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "success": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "info": {
      "dark": "macTeal",
      "light": "macTeal"
    },
    "text": {
      "dark": "macText",
      "light": "macText"
    },
    "textMuted": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "background": {
      "dark": "macBase",
      "light": "macBase"
    },
    "backgroundPanel": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "backgroundElement": {
      "dark": "macCrust",
      "light": "macCrust"
    },
    "border": {
      "dark": "macSurface0",
      "light": "macSurface0"
    },
    "borderActive": {
      "dark": "macSurface1",
      "light": "macSurface1"
    },
    "borderSubtle": {
      "dark": "macSurface2",
      "light": "macSurface2"
    },
    "diffAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffContext": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "diffHunkHeader": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "diffHighlightAdded": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "diffHighlightRemoved": {
      "dark": "macRed",
      "light": "macRed"
    },
    "diffAddedBg": {
      "dark": "#29342b",
      "light": "#29342b"
    },
    "diffRemovedBg": {
      "dark": "#3a2a31",
      "light": "#3a2a31"
    },
    "diffContextBg": {
      "dark": "macMantle",
      "light": "macMantle"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#223025",
      "light": "#223025"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2f242b",
      "light": "#2f242b"
    },
    "markdownText": {
      "dark": "macText",
      "light": "macText"
    },
    "markdownHeading": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "markdownLink": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownLinkText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCode": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "markdownBlockQuote": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownEmph": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "markdownStrong": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "markdownHorizontalRule": {
      "dark": "macSubtext0",
      "light": "macSubtext0"
    },
    "markdownListItem": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownListEnumeration": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownImage": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "markdownImageText": {
      "dark": "macSky",
      "light": "macSky"
    },
    "markdownCodeBlock": {
      "dark": "macText",
      "light": "macText"
    },
    "syntaxComment": {
      "dark": "macOverlay2",
      "light": "macOverlay2"
    },
    "syntaxKeyword": {
      "dark": "macMauve",
      "light": "macMauve"
    },
    "syntaxFunction": {
      "dark": "macBlue",
      "light": "macBlue"
    },
    "syntaxVariable": {
      "dark": "macRed",
      "light": "macRed"
    },
    "syntaxString": {
      "dark": "macGreen",
      "light": "macGreen"
    },
    "syntaxNumber": {
      "dark": "macPeach",
      "light": "macPeach"
    },
    "syntaxType": {
      "dark": "macYellow",
      "light": "macYellow"
    },
    "syntaxOperator": {
      "dark": "macSky",
      "light": "macSky"
    },
    "syntaxPunctuation": {
      "dark": "macText",
      "light": "macText"
    }
      }
    };
    const catppuccin = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "lightRosewater": "#dc8a78",
    "lightFlamingo": "#dd7878",
    "lightPink": "#ea76cb",
    "lightMauve": "#8839ef",
    "lightRed": "#d20f39",
    "lightMaroon": "#e64553",
    "lightPeach": "#fe640b",
    "lightYellow": "#df8e1d",
    "lightGreen": "#40a02b",
    "lightTeal": "#179299",
    "lightSky": "#04a5e5",
    "lightSapphire": "#209fb5",
    "lightBlue": "#1e66f5",
    "lightLavender": "#7287fd",
    "lightText": "#4c4f69",
    "lightSubtext1": "#5c5f77",
    "lightSubtext0": "#6c6f85",
    "lightOverlay2": "#7c7f93",
    "lightOverlay1": "#8c8fa1",
    "lightOverlay0": "#9ca0b0",
    "lightSurface2": "#acb0be",
    "lightSurface1": "#bcc0cc",
    "lightSurface0": "#ccd0da",
    "lightBase": "#eff1f5",
    "lightMantle": "#e6e9ef",
    "lightCrust": "#dce0e8",
    "darkRosewater": "#f5e0dc",
    "darkFlamingo": "#f2cdcd",
    "darkPink": "#f5c2e7",
    "darkMauve": "#cba6f7",
    "darkRed": "#f38ba8",
    "darkMaroon": "#eba0ac",
    "darkPeach": "#fab387",
    "darkYellow": "#f9e2af",
    "darkGreen": "#a6e3a1",
    "darkTeal": "#94e2d5",
    "darkSky": "#89dceb",
    "darkSapphire": "#74c7ec",
    "darkBlue": "#89b4fa",
    "darkLavender": "#b4befe",
    "darkText": "#cdd6f4",
    "darkSubtext1": "#bac2de",
    "darkSubtext0": "#a6adc8",
    "darkOverlay2": "#9A9FB7",
    "darkOverlay1": "#7f849c",
    "darkOverlay0": "#6c7086",
    "darkSurface2": "#585b70",
    "darkSurface1": "#676978",
    "darkSurface0": "#313244",
    "darkBase": "#1e1e2e",
    "darkMantle": "#181825",
    "darkCrust": "#11111b"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "accent": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkTeal",
      "light": "lightTeal"
    },
    "text": {
      "dark": "darkText",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "background": {
      "dark": "darkBase",
      "light": "lightBase"
    },
    "backgroundPanel": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "backgroundElement": {
      "dark": "darkCrust",
      "light": "lightCrust"
    },
    "border": {
      "dark": "darkSurface0",
      "light": "lightSurface0"
    },
    "borderActive": {
      "dark": "darkSurface1",
      "light": "lightSurface1"
    },
    "borderSubtle": {
      "dark": "darkSurface2",
      "light": "lightSurface2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "diffHunkHeader": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#24312b",
      "light": "#d6f0d9"
    },
    "diffRemovedBg": {
      "dark": "#3c2a32",
      "light": "#f6dfe2"
    },
    "diffContextBg": {
      "dark": "darkMantle",
      "light": "lightMantle"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#5b5d63"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1e2a25",
      "light": "#c9e3cb"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#32232a",
      "light": "#e9d3d6"
    },
    "markdownText": {
      "dark": "darkText",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "markdownHorizontalRule": {
      "dark": "darkSubtext0",
      "light": "lightSubtext0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "markdownCodeBlock": {
      "dark": "darkText",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "darkOverlay2",
      "light": "lightOverlay2"
    },
    "syntaxKeyword": {
      "dark": "darkMauve",
      "light": "lightMauve"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkPeach",
      "light": "lightPeach"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkSky",
      "light": "lightSky"
    },
    "syntaxPunctuation": {
      "dark": "darkText",
      "light": "lightText"
    }
      }
    };
    const cobalt2 = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#193549",
    "backgroundAlt": "#122738",
    "backgroundPanel": "#1f4662",
    "foreground": "#ffffff",
    "foregroundMuted": "#C3CAD7",
    "yellow": "#ffc600",
    "yellowBright": "#ffe14c",
    "orange": "#ff9d00",
    "orangeBright": "#ffb454",
    "mint": "#2affdf",
    "mintBright": "#7efff5",
    "blue": "#4DACFF",
    "blueBright": "#5cb7ff",
    "pink": "#FF638C",
    "pinkBright": "#ff86a5",
    "green": "#9eff80",
    "greenBright": "#b9ff9f",
    "purple": "#9a5feb",
    "purpleBright": "#b88cfd",
    "red": "#ff0088",
    "redBright": "#ff5fb3"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "secondary": {
      "dark": "purple",
      "light": "#7c4dff"
    },
    "accent": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e91e63"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#193549"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "background": {
      "dark": "#193549",
      "light": "#ffffff"
    },
    "backgroundPanel": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "backgroundElement": {
      "dark": "#1f4662",
      "light": "#e8ecf1"
    },
    "border": {
      "dark": "#1f4662",
      "light": "#d3dae3"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "borderSubtle": {
      "dark": "#0e1e2e",
      "light": "#e8ecf1"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e91e63"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "diffHunkHeader": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#e91e63"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#122738",
      "light": "#f5f7fa"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#193549"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownLinkText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c6b7d"
    },
    "markdownEmph": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownStrong": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownHorizontalRule": {
      "dark": "#2d5a7b",
      "light": "#d3dae3"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownListEnumeration": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#0066cc"
    },
    "markdownImageText": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxComment": {
      "dark": "#088CFF",
      "light": "#5c6b7d"
    },
    "syntaxKeyword": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxFunction": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#193549"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#4caf50"
    },
    "syntaxNumber": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxType": {
      "dark": "mint",
      "light": "#00acc1"
    },
    "syntaxOperator": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#193549"
    }
      }
    };
    const cursor = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#181818",
    "darkPanel": "#141414",
    "darkElement": "#262626",
    "darkFg": "#e4e4e4",
    "darkMuted": "#A5A5A5",
    "darkBorder": "#e4e4e413",
    "darkBorderActive": "#e4e4e426",
    "darkCyan": "#88c0d0",
    "darkBlue": "#81a1c1",
    "darkGreen": "#3fa266",
    "darkGreenBright": "#70b489",
    "darkRed": "#e34671",
    "darkRedBright": "#fc6b83",
    "darkYellow": "#f1b467",
    "darkOrange": "#d2943e",
    "darkPink": "#E394DC",
    "darkPurple": "#AAA0FA",
    "darkTeal": "#82D2CE",
    "darkSyntaxYellow": "#F8C762",
    "darkSyntaxOrange": "#EFB080",
    "darkSyntaxGreen": "#A8CC7C",
    "darkSyntaxBlue": "#87C3FF",
    "lightBg": "#fcfcfc",
    "lightPanel": "#f3f3f3",
    "lightElement": "#ededed",
    "lightFg": "#141414",
    "lightMuted": "#141414ad",
    "lightBorder": "#14141413",
    "lightBorderActive": "#14141426",
    "lightTeal": "#6f9ba6",
    "lightBlue": "#3c7cab",
    "lightBlueDark": "#206595",
    "lightGreen": "#1f8a65",
    "lightGreenBright": "#55a583",
    "lightRed": "#cf2d56",
    "lightRedBright": "#e75e78",
    "lightOrange": "#db704b",
    "lightYellow": "#c08532",
    "lightPurple": "#9e94d5",
    "lightPurpleDark": "#6049b3",
    "lightPink": "#b8448b",
    "lightMagenta": "#b3003f"
      },
      "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "secondary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "backgroundElement": {
      "dark": "darkElement",
      "light": "lightElement"
    },
    "border": {
      "dark": "darkBorder",
      "light": "lightBorder"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightTeal"
    },
    "borderSubtle": {
      "dark": "#0f0f0f",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHunkHeader": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreenBright"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRedBright"
    },
    "diffAddedBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "diffContextBg": {
      "dark": "darkPanel",
      "light": "lightPanel"
    },
    "diffLineNumber": {
      "dark": "#eeeeee87",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3fa26633",
      "light": "#1f8a651f"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#b8004933",
      "light": "#cf2d5614"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightBlueDark"
    },
    "markdownLink": {
      "dark": "darkTeal",
      "light": "lightBlueDark"
    },
    "markdownLinkText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownEmph": {
      "dark": "darkTeal",
      "light": "lightFg"
    },
    "markdownStrong": {
      "dark": "darkSyntaxYellow",
      "light": "lightFg"
    },
    "markdownHorizontalRule": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "markdownListItem": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightMuted"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightBlueDark"
    },
    "markdownImageText": {
      "dark": "darkBlue",
      "light": "lightMuted"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkMuted",
      "light": "lightMuted"
    },
    "syntaxKeyword": {
      "dark": "darkTeal",
      "light": "lightMagenta"
    },
    "syntaxFunction": {
      "dark": "darkSyntaxOrange",
      "light": "lightOrange"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkPink",
      "light": "lightPurple"
    },
    "syntaxNumber": {
      "dark": "darkSyntaxYellow",
      "light": "lightPink"
    },
    "syntaxType": {
      "dark": "darkSyntaxOrange",
      "light": "lightBlueDark"
    },
    "syntaxOperator": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const dracula = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#282a36",
    "currentLine": "#44475a",
    "selection": "#44475a",
    "foreground": "#f8f8f2",
    "comment": "#CCD2E2",
    "cyan": "#8be9fd",
    "green": "#50fa7b",
    "orange": "#ffb86c",
    "pink": "#ff79c6",
    "purple": "#bd93f9",
    "red": "#ff5555",
    "yellow": "#f1fa8c"
      },
      "theme": {
    "primary": {
      "dark": "purple",
      "light": "purple"
    },
    "secondary": {
      "dark": "pink",
      "light": "pink"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "background": {
      "dark": "#282a36",
      "light": "#f8f8f2"
    },
    "backgroundPanel": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "backgroundElement": {
      "dark": "currentLine",
      "light": "#d8d8d2"
    },
    "border": {
      "dark": "currentLine",
      "light": "#c8c8c2"
    },
    "borderActive": {
      "dark": "purple",
      "light": "purple"
    },
    "borderSubtle": {
      "dark": "#191a21",
      "light": "#e0e0e0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#21222c",
      "light": "#e8e8e2"
    },
    "diffLineNumber": {
      "dark": "#989aa4",
      "light": "#686865"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "markdownListItem": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#6272a4"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#282a36"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#282a36"
    }
      }
    };
    const everforest = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#2d353b",
    "darkStep2": "#333c43",
    "darkStep3": "#343f44",
    "darkStep4": "#3d484d",
    "darkStep5": "#475258",
    "darkStep6": "#7a8478",
    "darkStep7": "#859289",
    "darkStep8": "#9da9a0",
    "darkStep9": "#a7c080",
    "darkStep10": "#83c092",
    "darkStep11": "#BEC3BD",
    "darkStep12": "#D9CEB5",
    "darkRed": "#e67e80",
    "darkOrange": "#e69875",
    "darkGreen": "#a7c080",
    "darkCyan": "#83c092",
    "darkYellow": "#dbbc7f",
    "lightStep1": "#fdf6e3",
    "lightStep2": "#efebd4",
    "lightStep3": "#f4f0d9",
    "lightStep4": "#efebd4",
    "lightStep5": "#e6e2cc",
    "lightStep6": "#a6b0a0",
    "lightStep7": "#939f91",
    "lightStep8": "#829181",
    "lightStep9": "#8da101",
    "lightStep10": "#35a77c",
    "lightStep11": "#a6b0a0",
    "lightStep12": "#5c6a72",
    "lightRed": "#f85552",
    "lightOrange": "#f57d26",
    "lightGreen": "#8da101",
    "lightCyan": "#35a77c",
    "lightYellow": "#dfa000"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "#7fbbb3",
      "light": "#3a94c5"
    },
    "accent": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#a0a5a7",
      "light": "#5b5951"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#d699b6",
      "light": "#df69ba"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const flexoki = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "black": "#100F0F",
    "base950": "#1C1B1A",
    "base900": "#282726",
    "base850": "#343331",
    "base800": "#403E3C",
    "base700": "#575653",
    "base600": "#A8A8A5",
    "base500": "#878580",
    "base300": "#B7B5AC",
    "base200": "#CECDC3",
    "base150": "#DAD8CE",
    "base100": "#E6E4D9",
    "base50": "#F2F0E5",
    "paper": "#FFFCF0",
    "red400": "#D14D41",
    "red600": "#AF3029",
    "orange400": "#DF854A",
    "orange600": "#BC5215",
    "yellow400": "#D0A215",
    "yellow600": "#AD8301",
    "green400": "#879A39",
    "green600": "#66800B",
    "cyan400": "#3AA99F",
    "cyan600": "#24837B",
    "blue400": "#4788BF",
    "blue600": "#205EA6",
    "purple400": "#8B7EC8",
    "purple600": "#5E409D",
    "magenta400": "#CE5D97",
    "magenta600": "#A02F6F"
      },
      "theme": {
    "primary": {
      "dark": "orange400",
      "light": "blue600"
    },
    "secondary": {
      "dark": "blue400",
      "light": "purple600"
    },
    "accent": {
      "dark": "purple400",
      "light": "orange600"
    },
    "error": {
      "dark": "red400",
      "light": "red600"
    },
    "warning": {
      "dark": "orange400",
      "light": "orange600"
    },
    "success": {
      "dark": "green400",
      "light": "green600"
    },
    "info": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "text": {
      "dark": "base200",
      "light": "black"
    },
    "textMuted": {
      "dark": "base600",
      "light": "base600"
    },
    "background": {
      "dark": "black",
      "light": "paper"
    },
    "backgroundPanel": {
      "dark": "base950",
      "light": "base50"
    },
    "backgroundElement": {
      "dark": "base900",
      "light": "base100"
    },
    "border": {
      "dark": "base700",
      "light": "base300"
    },
    "borderActive": {
      "dark": "base600",
      "light": "base500"
    },
    "borderSubtle": {
      "dark": "base800",
      "light": "base200"
    },
    "diffAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffContext": {
      "dark": "base600",
      "light": "base600"
    },
    "diffHunkHeader": {
      "dark": "blue400",
      "light": "blue600"
    },
    "diffHighlightAdded": {
      "dark": "green400",
      "light": "green600"
    },
    "diffHighlightRemoved": {
      "dark": "red400",
      "light": "red600"
    },
    "diffAddedBg": {
      "dark": "#1A2D1A",
      "light": "#D5E5D5"
    },
    "diffRemovedBg": {
      "dark": "#2D1A1A",
      "light": "#F7D8DB"
    },
    "diffContextBg": {
      "dark": "base950",
      "light": "base50"
    },
    "diffLineNumber": {
      "dark": "#888883",
      "light": "#5a5955"
    },
    "diffAddedLineNumberBg": {
      "dark": "#152515",
      "light": "#C5D5C5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#251515",
      "light": "#E7C8CB"
    },
    "markdownText": {
      "dark": "base200",
      "light": "black"
    },
    "markdownHeading": {
      "dark": "purple400",
      "light": "purple600"
    },
    "markdownLink": {
      "dark": "blue400",
      "light": "blue600"
    },
    "markdownLinkText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCode": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownBlockQuote": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownEmph": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "markdownStrong": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownHorizontalRule": {
      "dark": "base600",
      "light": "base600"
    },
    "markdownListItem": {
      "dark": "orange400",
      "light": "orange600"
    },
    "markdownListEnumeration": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownImage": {
      "dark": "magenta400",
      "light": "magenta600"
    },
    "markdownImageText": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "markdownCodeBlock": {
      "dark": "base200",
      "light": "black"
    },
    "syntaxComment": {
      "dark": "base600",
      "light": "base600"
    },
    "syntaxKeyword": {
      "dark": "green400",
      "light": "green600"
    },
    "syntaxFunction": {
      "dark": "orange400",
      "light": "orange600"
    },
    "syntaxVariable": {
      "dark": "blue400",
      "light": "blue600"
    },
    "syntaxString": {
      "dark": "cyan400",
      "light": "cyan600"
    },
    "syntaxNumber": {
      "dark": "purple400",
      "light": "purple600"
    },
    "syntaxType": {
      "dark": "yellow400",
      "light": "yellow600"
    },
    "syntaxOperator": {
      "dark": "base300",
      "light": "base600"
    },
    "syntaxPunctuation": {
      "dark": "base300",
      "light": "base600"
    }
      }
    };
    const github = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#0d1117",
    "darkBgAlt": "#010409",
    "darkBgPanel": "#161b22",
    "darkFg": "#c9d1d9",
    "darkFgMuted": "#949DA6",
    "darkBlue": "#59A6FF",
    "darkGreen": "#3fb950",
    "darkRed": "#f85149",
    "darkOrange": "#d29922",
    "darkPurple": "#bc8cff",
    "darkPink": "#ff7b72",
    "darkYellow": "#e3b341",
    "darkCyan": "#39c5cf",
    "lightBg": "#ffffff",
    "lightBgAlt": "#f6f8fa",
    "lightBgPanel": "#f0f3f6",
    "lightFg": "#24292f",
    "lightFgMuted": "#57606a",
    "lightBlue": "#0969da",
    "lightGreen": "#1a7f37",
    "lightRed": "#cf222e",
    "lightOrange": "#bc4c00",
    "lightPurple": "#8250df",
    "lightPink": "#bf3989",
    "lightYellow": "#9a6700",
    "lightCyan": "#1b7c83"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#21262d",
      "light": "#d8dee4"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightAdded": {
      "dark": "#3fb950",
      "light": "#1a7f37"
    },
    "diffHighlightRemoved": {
      "dark": "#f85149",
      "light": "#cf222e"
    },
    "diffAddedBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#95999e",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#033a16",
      "light": "#dafbe1"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#67060c",
      "light": "#ffebe9"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkPink",
      "light": "lightPink"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#30363d",
      "light": "#d0d7de"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxVariable": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxString": {
      "dark": "darkCyan",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkBlue",
      "light": "lightCyan"
    },
    "syntaxType": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxOperator": {
      "dark": "darkPink",
      "light": "lightRed"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const gruvbox = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg0": "#282828",
    "darkBg1": "#3c3836",
    "darkBg2": "#504945",
    "darkBg3": "#665c54",
    "darkFg0": "#fbf1c7",
    "darkFg1": "#EDDFBA",
    "darkGray": "#DAD5CF",
    "darkRed": "#cc241d",
    "darkGreen": "#98971a",
    "darkYellow": "#d79921",
    "darkBlue": "#458588",
    "darkPurple": "#b16286",
    "darkAqua": "#689d6a",
    "darkOrange": "#d65d0e",
    "darkRedBright": "#FC7B6B",
    "darkGreenBright": "#b8bb26",
    "darkYellowBright": "#fabd2f",
    "darkBlueBright": "#88A99C",
    "darkPurpleBright": "#D58DA1",
    "darkAquaBright": "#8ec07c",
    "darkOrangeBright": "#fe8019",
    "lightBg0": "#fbf1c7",
    "lightBg1": "#ebdbb2",
    "lightBg2": "#d5c4a1",
    "lightBg3": "#bdae93",
    "lightFg0": "#282828",
    "lightFg1": "#3c3836",
    "lightGray": "#7c6f64",
    "lightRed": "#9d0006",
    "lightGreen": "#79740e",
    "lightYellow": "#b57614",
    "lightBlue": "#076678",
    "lightPurple": "#8f3f71",
    "lightAqua": "#427b58",
    "lightOrange": "#af3a03"
      },
      "theme": {
    "primary": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "error": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "text": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkAqua",
      "light": "lightAqua"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#32302f",
      "light": "#dcd8a4"
    },
    "diffRemovedBg": {
      "dark": "#322929",
      "light": "#e2c7c3"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#a8a29e",
      "light": "#564f43"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2a2827",
      "light": "#cec99e"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2a2222",
      "light": "#d3bdb9"
    },
    "markdownText": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "markdownHeading": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownLinkText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "markdownStrong": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImage": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "markdownImageText": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg1",
      "light": "lightFg1"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "syntaxFunction": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxVariable": {
      "dark": "darkBlueBright",
      "light": "lightBlue"
    },
    "syntaxString": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "syntaxNumber": {
      "dark": "darkPurpleBright",
      "light": "lightPurple"
    },
    "syntaxType": {
      "dark": "darkAquaBright",
      "light": "lightAqua"
    },
    "syntaxOperator": {
      "dark": "darkOrangeBright",
      "light": "lightOrange"
    },
    "syntaxPunctuation": {
      "dark": "darkFg1",
      "light": "lightFg1"
    }
      }
    };
    const kanagawa = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "sumiInk0": "#1F1F28",
    "sumiInk1": "#2A2A37",
    "sumiInk2": "#363646",
    "sumiInk3": "#54546D",
    "fujiWhite": "#DCD7BA",
    "oldWhite": "#C8C093",
    "fujiGray": "#BABAB6",
    "oniViolet": "#9D88BD",
    "crystalBlue": "#7E9CD8",
    "carpYellow": "#C38D9D",
    "sakuraPink": "#D27E99",
    "waveAqua": "#76946A",
    "roninYellow": "#D7A657",
    "dragonRed": "#E82424",
    "lotusGreen": "#98BB6C",
    "waveBlue": "#2D4F67",
    "lightBg": "#F2E9DE",
    "lightPaper": "#EAE4D7",
    "lightText": "#54433A",
    "lightGray": "#9E9389"
      },
      "theme": {
    "primary": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "secondary": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "accent": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "error": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "warning": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "success": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "info": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "text": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "sumiInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "sumiInk2",
      "light": "#E3DCD2"
    },
    "border": {
      "dark": "sumiInk3",
      "light": "#D4CBBF"
    },
    "borderActive": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "borderSubtle": {
      "dark": "sumiInk2",
      "light": "#DCD4C9"
    },
    "diffAdded": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "diffRemoved": {
      "dark": "dragonRed",
      "light": "dragonRed"
    },
    "diffContext": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "waveBlue",
      "light": "waveBlue"
    },
    "diffHighlightAdded": {
      "dark": "#A9D977",
      "light": "#89AF5B"
    },
    "diffHighlightRemoved": {
      "dark": "#F24A4A",
      "light": "#D61F1F"
    },
    "diffAddedBg": {
      "dark": "#252E25",
      "light": "#EAF3E4"
    },
    "diffRemovedBg": {
      "dark": "#362020",
      "light": "#FBE6E6"
    },
    "diffContextBg": {
      "dark": "sumiInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "#9090a0",
      "light": "#65615c"
    },
    "diffAddedLineNumberBg": {
      "dark": "#202820",
      "light": "#DDE8D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2D1C1C",
      "light": "#F2DADA"
    },
    "markdownText": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "markdownLink": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownLinkText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCode": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "markdownBlockQuote": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "markdownStrong": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "markdownHorizontalRule": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownListEnumeration": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownImage": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "markdownImageText": {
      "dark": "waveAqua",
      "light": "waveAqua"
    },
    "markdownCodeBlock": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "fujiGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "oniViolet",
      "light": "oniViolet"
    },
    "syntaxFunction": {
      "dark": "crystalBlue",
      "light": "waveBlue"
    },
    "syntaxVariable": {
      "dark": "fujiWhite",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "lotusGreen",
      "light": "lotusGreen"
    },
    "syntaxNumber": {
      "dark": "roninYellow",
      "light": "roninYellow"
    },
    "syntaxType": {
      "dark": "carpYellow",
      "light": "carpYellow"
    },
    "syntaxOperator": {
      "dark": "sakuraPink",
      "light": "sakuraPink"
    },
    "syntaxPunctuation": {
      "dark": "fujiWhite",
      "light": "lightText"
    }
      }
    };
    const lucent_orng = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep6": "#3c3c3c",
    "darkStep11": "#929292",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#F07B54",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "darkPanelBg": "#2a1a1599",
    "lightStep6": "#d4d4d4",
    "lightStep11": "#545454",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#E67546",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#C04A23",
    "lightBlue": "#0062d1",
    "lightCyan": "#2F818F",
    "lightYellow": "#95711A",
    "lightPanelBg": "#fff5f099"
      },
      "theme": {
    "primary": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundPanel": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundElement": {
      "dark": "transparent",
      "light": "transparent"
    },
    "backgroundMenu": {
      "dark": "darkPanelBg",
      "light": "lightPanelBg"
    },
    "border": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "borderActive": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffContextBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffLineNumber": "textMuted",
    "diffAddedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "diffRemovedLineNumberBg": {
      "dark": "transparent",
      "light": "transparent"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLink": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "darkAccent",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkSecondary",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxFunction": {
      "dark": "darkSecondary",
      "light": "lightAccent"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "darkAccent",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const material = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#263238",
    "darkBgAlt": "#1e272c",
    "darkBgPanel": "#37474f",
    "darkFg": "#eeffff",
    "darkFgMuted": "#C5CED2",
    "darkRed": "#f07178",
    "darkPink": "#f78c6c",
    "darkOrange": "#ffcb6b",
    "darkYellow": "#ffcb6b",
    "darkGreen": "#c3e88d",
    "darkCyan": "#89ddff",
    "darkBlue": "#82aaff",
    "darkPurple": "#c792ea",
    "darkViolet": "#bb80b3",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f5f5f5",
    "lightBgPanel": "#e7e7e8",
    "lightFg": "#263238",
    "lightFgMuted": "#90a4ae",
    "lightRed": "#e53935",
    "lightPink": "#ec407a",
    "lightOrange": "#f4511e",
    "lightYellow": "#ffb300",
    "lightGreen": "#91b859",
    "lightCyan": "#39adb5",
    "lightBlue": "#6182b8",
    "lightPurple": "#7c4dff",
    "lightViolet": "#945eb8"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#1e272c",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9aa2a6",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLink": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "#37474f",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const matrix = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "matrixInk0": "#0a0e0a",
    "matrixInk1": "#0e130d",
    "matrixInk2": "#141c12",
    "matrixInk3": "#1e2a1b",
    "rainGreen": "#2eff6a",
    "rainGreenDim": "#1cc24b",
    "rainGreenHi": "#62ff94",
    "rainCyan": "#00efff",
    "rainTeal": "#24f6d9",
    "rainPurple": "#c770ff",
    "rainOrange": "#ffa83d",
    "alertRed": "#ff4b4b",
    "alertYellow": "#e6ff57",
    "alertBlue": "#30b3ff",
    "rainGray": "#8ca391",
    "lightBg": "#eef3ea",
    "lightPaper": "#e4ebe1",
    "lightInk1": "#dae1d7",
    "lightText": "#203022",
    "lightGray": "#748476"
      },
      "theme": {
    "primary": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "secondary": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "accent": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "error": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "warning": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "success": {
      "dark": "rainGreenHi",
      "light": "rainGreenDim"
    },
    "info": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "text": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "textMuted": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "matrixInk0",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "backgroundElement": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "border": {
      "dark": "matrixInk3",
      "light": "lightGray"
    },
    "borderActive": {
      "dark": "rainGreen",
      "light": "rainGreenDim"
    },
    "borderSubtle": {
      "dark": "matrixInk2",
      "light": "lightInk1"
    },
    "diffAdded": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "diffRemoved": {
      "dark": "alertRed",
      "light": "alertRed"
    },
    "diffContext": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "diffHighlightAdded": {
      "dark": "#77ffaf",
      "light": "#5dac7e"
    },
    "diffHighlightRemoved": {
      "dark": "#ff7171",
      "light": "#d53a3a"
    },
    "diffAddedBg": {
      "dark": "#132616",
      "light": "#e0efde"
    },
    "diffRemovedBg": {
      "dark": "#261212",
      "light": "#f9e5e5"
    },
    "diffContextBg": {
      "dark": "matrixInk1",
      "light": "lightPaper"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#556156"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0f1b11",
      "light": "#d6e7d2"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1b1414",
      "light": "#f2d2d2"
    },
    "markdownText": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "markdownHeading": {
      "dark": "rainCyan",
      "light": "rainTeal"
    },
    "markdownLink": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownLinkText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCode": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "markdownBlockQuote": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "markdownStrong": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "markdownHorizontalRule": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownListEnumeration": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownImage": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "markdownImageText": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "markdownCodeBlock": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxComment": {
      "dark": "rainGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "rainPurple",
      "light": "rainPurple"
    },
    "syntaxFunction": {
      "dark": "alertBlue",
      "light": "alertBlue"
    },
    "syntaxVariable": {
      "dark": "rainGreenHi",
      "light": "lightText"
    },
    "syntaxString": {
      "dark": "rainGreenDim",
      "light": "rainGreenDim"
    },
    "syntaxNumber": {
      "dark": "rainOrange",
      "light": "rainOrange"
    },
    "syntaxType": {
      "dark": "alertYellow",
      "light": "alertYellow"
    },
    "syntaxOperator": {
      "dark": "rainTeal",
      "light": "rainTeal"
    },
    "syntaxPunctuation": {
      "dark": "rainGreenHi",
      "light": "lightText"
    }
      }
    };
    const mercury = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "purple-800": "#3442a6",
    "purple-700": "#465bd1",
    "purple-600": "#5266eb",
    "purple-400": "#8da4f5",
    "purple-300": "#a7b6f8",
    "red-700": "#b0175f",
    "red-600": "#d03275",
    "red-400": "#fc92b4",
    "green-700": "#036e43",
    "green-600": "#188554",
    "green-400": "#77c599",
    "orange-700": "#a44200",
    "orange-600": "#c45000",
    "orange-400": "#fc9b6f",
    "blue-600": "#007f95",
    "blue-400": "#77becf",
    "neutral-1000": "#10101a",
    "neutral-950": "#171721",
    "neutral-900": "#1e1e2a",
    "neutral-800": "#272735",
    "neutral-700": "#363644",
    "neutral-600": "#535461",
    "neutral-500": "#70707d",
    "neutral-400": "#A8A8B1",
    "neutral-300": "#c3c3cc",
    "neutral-200": "#dddde5",
    "neutral-100": "#f4f5f9",
    "neutral-050": "#fbfcfd",
    "neutral-000": "#ffffff",
    "neutral-150": "#ededf3",
    "border-light": "#7073931a",
    "border-light-subtle": "#7073930f",
    "border-dark": "#b4b7c81f",
    "border-dark-subtle": "#b4b7c814",
    "diff-added-light": "#1885541a",
    "diff-removed-light": "#d032751a",
    "diff-added-dark": "#77c59933",
    "diff-removed-dark": "#fc92b433"
      },
      "theme": {
    "primary": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "secondary": {
      "light": "purple-700",
      "dark": "purple-300"
    },
    "accent": {
      "light": "purple-400",
      "dark": "purple-400"
    },
    "error": {
      "light": "red-700",
      "dark": "red-400"
    },
    "warning": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "success": {
      "light": "green-700",
      "dark": "green-400"
    },
    "info": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "text": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "textMuted": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "background": {
      "light": "neutral-000",
      "dark": "neutral-950"
    },
    "backgroundPanel": {
      "light": "neutral-050",
      "dark": "neutral-1000"
    },
    "backgroundElement": {
      "light": "neutral-100",
      "dark": "neutral-800"
    },
    "border": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "borderActive": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "borderSubtle": {
      "light": "border-light-subtle",
      "dark": "border-dark-subtle"
    },
    "diffAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffContext": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHunkHeader": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "diffHighlightAdded": {
      "light": "green-700",
      "dark": "green-400"
    },
    "diffHighlightRemoved": {
      "light": "red-700",
      "dark": "red-400"
    },
    "diffAddedBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "diffContextBg": {
      "light": "neutral-050",
      "dark": "neutral-900"
    },
    "diffLineNumber": {
      "light": "neutral-600",
      "dark": "neutral-300"
    },
    "diffAddedLineNumberBg": {
      "light": "diff-added-light",
      "dark": "diff-added-dark"
    },
    "diffRemovedLineNumberBg": {
      "light": "diff-removed-light",
      "dark": "diff-removed-dark"
    },
    "markdownText": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "markdownHeading": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownLink": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownLinkText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCode": {
      "light": "green-700",
      "dark": "green-400"
    },
    "markdownBlockQuote": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "markdownEmph": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "markdownStrong": {
      "light": "neutral-900",
      "dark": "neutral-100"
    },
    "markdownHorizontalRule": {
      "light": "border-light",
      "dark": "border-dark"
    },
    "markdownListItem": {
      "light": "neutral-900",
      "dark": "neutral-000"
    },
    "markdownListEnumeration": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "markdownImage": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "markdownImageText": {
      "light": "purple-600",
      "dark": "purple-300"
    },
    "markdownCodeBlock": {
      "light": "neutral-700",
      "dark": "neutral-200"
    },
    "syntaxComment": {
      "light": "neutral-500",
      "dark": "neutral-400"
    },
    "syntaxKeyword": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxFunction": {
      "light": "purple-600",
      "dark": "purple-400"
    },
    "syntaxVariable": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxString": {
      "light": "green-700",
      "dark": "green-400"
    },
    "syntaxNumber": {
      "light": "orange-700",
      "dark": "orange-400"
    },
    "syntaxType": {
      "light": "blue-600",
      "dark": "blue-400"
    },
    "syntaxOperator": {
      "light": "purple-700",
      "dark": "purple-400"
    },
    "syntaxPunctuation": {
      "light": "neutral-700",
      "dark": "neutral-200"
    }
      }
    };
    const monokai = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#272822",
    "backgroundAlt": "#1e1f1c",
    "backgroundPanel": "#3e3d32",
    "foreground": "#f8f8f2",
    "comment": "#C2C1B8",
    "red": "#f92672",
    "orange": "#fd971f",
    "lightOrange": "#e69f66",
    "yellow": "#e6db74",
    "green": "#a6e22e",
    "cyan": "#66d9ef",
    "blue": "#66d9ef",
    "purple": "#ae81ff",
    "pink": "#FA4989"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "blue"
    },
    "secondary": {
      "dark": "purple",
      "light": "purple"
    },
    "accent": {
      "dark": "green",
      "light": "green"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "orange"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "foreground",
      "light": "#272822"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#75715e"
    },
    "background": {
      "dark": "#272822",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "backgroundElement": {
      "dark": "#3e3d32",
      "light": "#e0e0e0"
    },
    "border": {
      "dark": "#3e3d32",
      "light": "#d0d0d0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "blue"
    },
    "borderSubtle": {
      "dark": "#1e1f1c",
      "light": "#e8e8e8"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHunkHeader": {
      "dark": "comment",
      "light": "#75715e"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "diffContextBg": {
      "dark": "#1e1f1c",
      "light": "#f0f0f0"
    },
    "diffLineNumber": {
      "dark": "#9b9b95",
      "light": "#686868"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a1a",
      "light": "#e0ffe0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a1a",
      "light": "#ffe0e0"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#272822"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "pink"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "orange"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#75715e"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "blue"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "purple"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#75715e"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxFunction": {
      "dark": "green",
      "light": "green"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#272822"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "orange"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "purple"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "blue"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "pink"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#272822"
    }
      }
    };
    const nightowl = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "nightOwlBg": "#011627",
    "nightOwlFg": "#d6deeb",
    "nightOwlBlue": "#82AAFF",
    "nightOwlCyan": "#7fdbca",
    "nightOwlGreen": "#c5e478",
    "nightOwlYellow": "#ecc48d",
    "nightOwlOrange": "#F78C6C",
    "nightOwlRed": "#EF5350",
    "nightOwlPink": "#ff5874",
    "nightOwlPurple": "#c792ea",
    "nightOwlMuted": "#91A7B8",
    "nightOwlGray": "#7C8D8D",
    "nightOwlLightGray": "#89a4bb",
    "nightOwlPanel": "#0b253a"
      },
      "theme": {
    "primary": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "secondary": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "accent": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "error": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "warning": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "success": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "info": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "text": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "textMuted": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "background": {
      "dark": "nightOwlBg",
      "light": "nightOwlBg"
    },
    "backgroundPanel": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "backgroundElement": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "border": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "borderActive": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "borderSubtle": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffContext": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHunkHeader": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "diffHighlightAdded": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "diffHighlightRemoved": {
      "dark": "nightOwlRed",
      "light": "nightOwlRed"
    },
    "diffAddedBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "diffContextBg": {
      "dark": "nightOwlPanel",
      "light": "nightOwlPanel"
    },
    "diffLineNumber": {
      "dark": "#7791a6",
      "light": "#7791a6"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0a2e1a",
      "light": "#0a2e1a"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1b1b",
      "light": "#2d1b1b"
    },
    "markdownText": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "markdownHeading": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownLink": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownLinkText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCode": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "markdownBlockQuote": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownEmph": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "markdownStrong": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "markdownHorizontalRule": {
      "dark": "nightOwlMuted",
      "light": "nightOwlMuted"
    },
    "markdownListItem": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownListEnumeration": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImage": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "markdownImageText": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "markdownCodeBlock": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxComment": {
      "dark": "nightOwlGray",
      "light": "nightOwlGray"
    },
    "syntaxKeyword": {
      "dark": "nightOwlPurple",
      "light": "nightOwlPurple"
    },
    "syntaxFunction": {
      "dark": "nightOwlBlue",
      "light": "nightOwlBlue"
    },
    "syntaxVariable": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    },
    "syntaxString": {
      "dark": "nightOwlYellow",
      "light": "nightOwlYellow"
    },
    "syntaxNumber": {
      "dark": "nightOwlOrange",
      "light": "nightOwlOrange"
    },
    "syntaxType": {
      "dark": "nightOwlGreen",
      "light": "nightOwlGreen"
    },
    "syntaxOperator": {
      "dark": "nightOwlCyan",
      "light": "nightOwlCyan"
    },
    "syntaxPunctuation": {
      "dark": "nightOwlFg",
      "light": "nightOwlFg"
    }
      }
    };
    const nord = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "nord0": "#2E3440",
    "nord1": "#3B4252",
    "nord2": "#434C5E",
    "nord3": "#9399A5",
    "nord4": "#D8DEE9",
    "nord5": "#E5E9F0",
    "nord6": "#ECEFF4",
    "nord7": "#8FBCBB",
    "nord8": "#88C0D0",
    "nord9": "#96B1CB",
    "nord10": "#5E81AC",
    "nord11": "#C7757C",
    "nord12": "#DAA08D",
    "nord13": "#EBCB8B",
    "nord14": "#A3BE8C",
    "nord15": "#C3A5BD"
      },
      "theme": {
    "primary": {
      "dark": "nord8",
      "light": "nord10"
    },
    "secondary": {
      "dark": "nord9",
      "light": "nord9"
    },
    "accent": {
      "dark": "nord7",
      "light": "nord7"
    },
    "error": {
      "dark": "nord11",
      "light": "nord11"
    },
    "warning": {
      "dark": "nord12",
      "light": "nord12"
    },
    "success": {
      "dark": "nord14",
      "light": "nord14"
    },
    "info": {
      "dark": "nord8",
      "light": "nord10"
    },
    "text": {
      "dark": "nord6",
      "light": "nord0"
    },
    "textMuted": {
      "dark": "#D4D8DE",
      "light": "nord1"
    },
    "background": {
      "dark": "nord0",
      "light": "nord6"
    },
    "backgroundPanel": {
      "dark": "nord1",
      "light": "nord5"
    },
    "backgroundElement": {
      "dark": "nord2",
      "light": "nord4"
    },
    "border": {
      "dark": "nord2",
      "light": "nord3"
    },
    "borderActive": {
      "dark": "nord3",
      "light": "nord2"
    },
    "borderSubtle": {
      "dark": "nord2",
      "light": "nord3"
    },
    "diffAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffContext": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHunkHeader": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "diffHighlightAdded": {
      "dark": "nord14",
      "light": "nord14"
    },
    "diffHighlightRemoved": {
      "dark": "nord11",
      "light": "nord11"
    },
    "diffAddedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffContextBg": {
      "dark": "nord1",
      "light": "nord5"
    },
    "diffLineNumber": {
      "dark": "#a9aeb6",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3B4252",
      "light": "#E5E9F0"
    },
    "markdownText": {
      "dark": "nord4",
      "light": "nord0"
    },
    "markdownHeading": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownLink": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownLinkText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCode": {
      "dark": "nord14",
      "light": "nord14"
    },
    "markdownBlockQuote": {
      "dark": "#A6AEBB",
      "light": "nord3"
    },
    "markdownEmph": {
      "dark": "nord12",
      "light": "nord12"
    },
    "markdownStrong": {
      "dark": "nord13",
      "light": "nord13"
    },
    "markdownHorizontalRule": {
      "dark": "#8B95A7",
      "light": "nord3"
    },
    "markdownListItem": {
      "dark": "nord8",
      "light": "nord10"
    },
    "markdownListEnumeration": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownImage": {
      "dark": "nord9",
      "light": "nord9"
    },
    "markdownImageText": {
      "dark": "nord7",
      "light": "nord7"
    },
    "markdownCodeBlock": {
      "dark": "nord4",
      "light": "nord0"
    },
    "syntaxComment": {
      "dark": "#A6AEBB",
      "light": "nord3"
    },
    "syntaxKeyword": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxFunction": {
      "dark": "nord8",
      "light": "nord8"
    },
    "syntaxVariable": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxString": {
      "dark": "nord14",
      "light": "nord14"
    },
    "syntaxNumber": {
      "dark": "nord15",
      "light": "nord15"
    },
    "syntaxType": {
      "dark": "nord7",
      "light": "nord7"
    },
    "syntaxOperator": {
      "dark": "nord9",
      "light": "nord9"
    },
    "syntaxPunctuation": {
      "dark": "nord4",
      "light": "nord0"
    }
      }
    };
    const oc_2 = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1F1F1F",
      "light": "#F7F7F7"
    },
    "backgroundPanel": {
      "dark": "#1C1C1C",
      "light": "#F8F8F8"
    },
    "backgroundElement": {
      "dark": "#232323",
      "light": "#F3F3F3"
    },
    "text": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "textMuted": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "primary": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "secondary": {
      "dark": "#1257FF",
      "light": "#034CFF"
    },
    "accent": {
      "dark": "#034CFF",
      "light": "#034CFF"
    },
    "error": {
      "dark": "#FC533A",
      "light": "#FC533A"
    },
    "warning": {
      "dark": "#FCD53A",
      "light": "#A58E0F"
    },
    "success": {
      "dark": "#12C905",
      "light": "#0FA604"
    },
    "info": {
      "dark": "#EDB2F1",
      "light": "#A753AE"
    },
    "border": {
      "dark": "#282828",
      "light": "#DBDBDB"
    },
    "borderActive": {
      "dark": "#AEAAA8",
      "light": "#5F5C5B"
    },
    "syntaxComment": {
      "dark": "#8F8F8F",
      "light": "#727272"
    },
    "syntaxKeyword": {
      "dark": "#EDB2F1",
      "light": "#A452AB"
    },
    "syntaxFunction": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "syntaxVariable": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "syntaxString": {
      "dark": "#00CEB9",
      "light": "#008174"
    },
    "syntaxNumber": {
      "dark": "#93E9F6",
      "light": "#007B80"
    },
    "syntaxType": {
      "dark": "#FCD53A",
      "light": "#8A6F00"
    },
    "syntaxOperator": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "markdownLink": {
      "dark": "#4A7FFF",
      "light": "#034CFF"
    },
    "markdownHeading": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownCode": {
      "dark": "#FAB283",
      "light": "#717248"
    },
    "markdownEmph": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownStrong": {
      "dark": "#EDEDED",
      "light": "#171717"
    },
    "markdownBlockQuote": {
      "dark": "#A4A4A4",
      "light": "#4E4E4E"
    },
    "markdownHorizontalRule": {
      "dark": "#282828",
      "light": "#DBDBDB"
    },
    "diffAdded": {
      "dark": "#12C905",
      "light": "#12C905"
    },
    "diffRemoved": {
      "dark": "#FC533A",
      "light": "#FC533A"
    },
    "diffAddedBg": {
      "dark": "#445043",
      "light": "#EBF6EA"
    },
    "diffRemovedBg": {
      "dark": "#502A25",
      "light": "#F8E0DD"
    },
    "diffAddedLineNumberBg": {
      "dark": "#445043",
      "light": "#EBF6EA"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#502A25",
      "light": "#F8E0DD"
    }
      }
    };
    const one_dark = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg": "#282c34",
    "darkBgAlt": "#21252b",
    "darkBgPanel": "#353b45",
    "darkFg": "#C6CAD3",
    "darkFgMuted": "#BBBEC3",
    "darkPurple": "#c678dd",
    "darkBlue": "#61afef",
    "darkRed": "#e06c75",
    "darkGreen": "#98c379",
    "darkYellow": "#e5c07b",
    "darkOrange": "#d19a66",
    "darkCyan": "#56b6c2",
    "lightBg": "#fafafa",
    "lightBgAlt": "#f0f0f1",
    "lightBgPanel": "#eaeaeb",
    "lightFg": "#383a42",
    "lightFgMuted": "#a0a1a7",
    "lightPurple": "#a626a4",
    "lightBlue": "#4078f2",
    "lightRed": "#e45649",
    "lightGreen": "#50a14f",
    "lightYellow": "#c18401",
    "lightOrange": "#986801",
    "lightCyan": "#0184bc"
      },
      "theme": {
    "primary": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "text": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "textMuted": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "background": {
      "dark": "darkBg",
      "light": "lightBg"
    },
    "backgroundPanel": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "backgroundElement": {
      "dark": "darkBgPanel",
      "light": "lightBgPanel"
    },
    "border": {
      "dark": "#393f4a",
      "light": "#d1d1d2"
    },
    "borderActive": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "borderSubtle": {
      "dark": "#2c313a",
      "light": "#e0e0e1"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "#aad482",
      "light": "#489447"
    },
    "diffHighlightRemoved": {
      "dark": "#e8828b",
      "light": "#d65145"
    },
    "diffAddedBg": {
      "dark": "#2c382b",
      "light": "#eafbe9"
    },
    "diffRemovedBg": {
      "dark": "#3a2d2f",
      "light": "#fce9e8"
    },
    "diffContextBg": {
      "dark": "darkBgAlt",
      "light": "lightBgAlt"
    },
    "diffLineNumber": {
      "dark": "#9398a2",
      "light": "#666666"
    },
    "diffAddedLineNumberBg": {
      "dark": "#283427",
      "light": "#e1f3df"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#36292b",
      "light": "#f5e2e1"
    },
    "markdownText": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "markdownListItem": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkFg",
      "light": "lightFg"
    },
    "syntaxComment": {
      "dark": "darkFgMuted",
      "light": "lightFgMuted"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkFg",
      "light": "lightFg"
    }
      }
    };
    const onedarkpro = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1E222A",
      "light": "#F5F6F8"
    },
    "backgroundPanel": {
      "dark": "#282C34",
      "light": "#E7E8EB"
    },
    "backgroundElement": {
      "dark": "#32363F",
      "light": "#D9DADE"
    },
    "text": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "textMuted": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "primary": {
      "dark": "#61AFEF",
      "light": "#406DC8"
    },
    "secondary": {
      "dark": "#E06C75",
      "light": "#D85462"
    },
    "accent": {
      "dark": "#E06C75",
      "light": "#D85462"
    },
    "error": {
      "dark": "#E06C75",
      "light": "#CF646C"
    },
    "warning": {
      "dark": "#E5C07B",
      "light": "#A97C52"
    },
    "success": {
      "dark": "#98C379",
      "light": "#479461"
    },
    "info": {
      "dark": "#56B6C2",
      "light": "#4C8ABC"
    },
    "border": {
      "dark": "#949BA7",
      "light": "#4B5059"
    },
    "borderActive": {
      "dark": "#7E848F",
      "light": "#6C6F77"
    },
    "syntaxComment": {
      "dark": "#8E939C",
      "light": "#636975"
    },
    "syntaxKeyword": {
      "dark": "#C678DD",
      "light": "#A626A4"
    },
    "syntaxFunction": {
      "dark": "#61AFEF",
      "light": "#3B65BA"
    },
    "syntaxVariable": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "syntaxString": {
      "dark": "#98C379",
      "light": "#38744C"
    },
    "syntaxNumber": {
      "dark": "#D19A66",
      "light": "#8D6001"
    },
    "syntaxType": {
      "dark": "#56B6C2",
      "light": "#3C6D94"
    },
    "syntaxOperator": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "markdownLink": {
      "dark": "#E17079",
      "light": "#AF4450"
    },
    "markdownHeading": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownCode": {
      "dark": "#61AFEF",
      "light": "#3B65BA"
    },
    "markdownEmph": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownStrong": {
      "dark": "#ABB2BF",
      "light": "#2B303B"
    },
    "markdownBlockQuote": {
      "dark": "#B5B8BD",
      "light": "#404144"
    },
    "markdownHorizontalRule": {
      "dark": "#949BA7",
      "light": "#4B5059"
    },
    "diffAdded": {
      "dark": "#98C379",
      "light": "#4FA66D"
    },
    "diffRemoved": {
      "dark": "#E06C75",
      "light": "#E06C75"
    },
    "diffAddedBg": {
      "dark": "#283735",
      "light": "#EEF4F2"
    },
    "diffRemovedBg": {
      "dark": "#3F2D36",
      "light": "#F5EFF1"
    },
    "diffAddedLineNumberBg": {
      "dark": "#283735",
      "light": "#EEF4F2"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3F2D36",
      "light": "#F5EFF1"
    }
      }
    };
    const opencode = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#696969",
    "darkStep9": "#fab283",
    "darkStep10": "#ffc09f",
    "darkStep11": "#9F9F9F",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#5c9cf5",
    "darkAccent": "#9d7cd8",
    "darkRed": "#e06c75",
    "darkOrange": "#f5a742",
    "darkGreen": "#7fd88f",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#fafafa",
    "lightStep3": "#f5f5f5",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#3b7dd8",
    "lightStep10": "#2968c3",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#7b5bb6",
    "lightAccent": "#d68c27",
    "lightRed": "#d1383d",
    "lightOrange": "#d68c27",
    "lightGreen": "#3d9a57",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f8f8f",
      "light": "#595959"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const orng = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#0a0a0a",
    "darkStep2": "#141414",
    "darkStep3": "#1e1e1e",
    "darkStep4": "#282828",
    "darkStep5": "#323232",
    "darkStep6": "#3c3c3c",
    "darkStep7": "#484848",
    "darkStep8": "#606060",
    "darkStep9": "#F07B54",
    "darkStep10": "#EE7948",
    "darkStep11": "#9F9F9F",
    "darkStep12": "#eeeeee",
    "darkSecondary": "#EE7948",
    "darkAccent": "#FFF7F1",
    "darkRed": "#e06c75",
    "darkOrange": "#EC5B2B",
    "darkBlue": "#6ba1e6",
    "darkCyan": "#56b6c2",
    "darkYellow": "#e5c07b",
    "lightStep1": "#ffffff",
    "lightStep2": "#FFF7F1",
    "lightStep3": "#f5f0eb",
    "lightStep4": "#ebebeb",
    "lightStep5": "#e1e1e1",
    "lightStep6": "#d4d4d4",
    "lightStep7": "#b8b8b8",
    "lightStep8": "#a0a0a0",
    "lightStep9": "#EC5B2B",
    "lightStep10": "#c94d24",
    "lightStep11": "#8a8a8a",
    "lightStep12": "#1a1a1a",
    "lightSecondary": "#EE7948",
    "lightAccent": "#c94d24",
    "lightRed": "#d1383d",
    "lightOrange": "#EC5B2B",
    "lightBlue": "#0062d1",
    "lightCyan": "#318795",
    "lightYellow": "#b0851f"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkSecondary",
      "light": "lightSecondary"
    },
    "accent": {
      "dark": "darkAccent",
      "light": "lightAccent"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "selectedListItemText": {
      "dark": "#0a0a0a",
      "light": "#ffffff"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "borderActive": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#6ba1e6",
      "light": "#0062d1"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#1a2a3d",
      "light": "#e0edfa"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "diffContext",
      "light": "#595755"
    },
    "diffAddedLineNumberBg": {
      "dark": "#162535",
      "light": "#d0e5f5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "markdownBlockQuote": {
      "dark": "#FFF7F1",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "#EE7948",
      "light": "#EC5B2B"
    },
    "markdownHorizontalRule": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "#EC5B2B",
      "light": "#EC5B2B"
    },
    "syntaxFunction": {
      "dark": "#EE7948",
      "light": "#c94d24"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxNumber": {
      "dark": "#FFF7F1",
      "light": "#EC5B2B"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const osaka_jade = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkBg0": "#111c18",
    "darkBg1": "#1a2520",
    "darkBg2": "#23372B",
    "darkBg3": "#3d4a44",
    "darkFg0": "#C1C497",
    "darkFg1": "#9aa88a",
    "darkGray": "#ABB6AF",
    "darkRed": "#FF5345",
    "darkGreen": "#549e6a",
    "darkYellow": "#4D9959",
    "darkBlue": "#539677",
    "darkMagenta": "#D2689C",
    "darkCyan": "#2DD5B7",
    "darkWhite": "#F6F5DD",
    "darkRedBright": "#db9f9c",
    "darkGreenBright": "#63b07a",
    "darkYellowBright": "#E5C736",
    "darkBlueBright": "#ACD4CF",
    "darkMagentaBright": "#75bbb3",
    "darkCyanBright": "#8CD3CB",
    "lightBg0": "#F6F5DD",
    "lightBg1": "#E8E7CC",
    "lightBg2": "#D5D4B8",
    "lightBg3": "#A8A78C",
    "lightFg0": "#111c18",
    "lightFg1": "#1a2520",
    "lightGray": "#53685B",
    "lightRed": "#c7392d",
    "lightGreen": "#3d7a52",
    "lightYellow": "#b5a020",
    "lightBlue": "#3d7560",
    "lightMagenta": "#a8527a",
    "lightCyan": "#1faa90"
      },
      "theme": {
    "primary": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "secondary": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "accent": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkYellowBright",
      "light": "lightYellow"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "text": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "textMuted": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "background": {
      "dark": "darkBg0",
      "light": "lightBg0"
    },
    "backgroundPanel": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "backgroundElement": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "border": {
      "dark": "darkBg3",
      "light": "lightBg3"
    },
    "borderActive": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "borderSubtle": {
      "dark": "darkBg2",
      "light": "lightBg2"
    },
    "diffAdded": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "diffRemoved": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "diffContext": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "diffHunkHeader": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "diffHighlightAdded": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "diffHighlightRemoved": {
      "dark": "darkRedBright",
      "light": "lightRed"
    },
    "diffAddedBg": {
      "dark": "#15241c",
      "light": "#e0eee5"
    },
    "diffRemovedBg": {
      "dark": "#241515",
      "light": "#eee0e0"
    },
    "diffContextBg": {
      "dark": "darkBg1",
      "light": "lightBg1"
    },
    "diffLineNumber": {
      "dark": "#828b87",
      "light": "#5f5e4f"
    },
    "diffAddedLineNumberBg": {
      "dark": "#121f18",
      "light": "#d5e5da"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#1f1212",
      "light": "#e5d5d5"
    },
    "markdownText": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHeading": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownLink": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownLinkText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCode": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownEmph": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "markdownStrong": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "markdownHorizontalRule": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "markdownListItem": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownListEnumeration": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkCyanBright",
      "light": "lightCyan"
    },
    "markdownImageText": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownCodeBlock": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxComment": {
      "dark": "darkGray",
      "light": "lightGray"
    },
    "syntaxKeyword": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxFunction": {
      "dark": "darkBlue",
      "light": "lightBlue"
    },
    "syntaxVariable": {
      "dark": "darkFg0",
      "light": "lightFg0"
    },
    "syntaxString": {
      "dark": "darkGreenBright",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkMagenta",
      "light": "lightMagenta"
    },
    "syntaxType": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxOperator": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxPunctuation": {
      "dark": "darkFg0",
      "light": "lightFg0"
    }
      }
    };
    const palenight = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#292d3e",
    "backgroundAlt": "#1e2132",
    "backgroundPanel": "#32364a",
    "foreground": "#C1C6DC",
    "foregroundBright": "#bfc7d5",
    "comment": "#B5B9CB",
    "red": "#f07178",
    "orange": "#f78c6c",
    "yellow": "#ffcb6b",
    "green": "#c3e88d",
    "cyan": "#89ddff",
    "blue": "#82aaff",
    "purple": "#c792ea",
    "magenta": "#ff5370",
    "pink": "#f07178"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "secondary": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "accent": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "error": {
      "dark": "red",
      "light": "#e53935"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "success": {
      "dark": "green",
      "light": "#91b859"
    },
    "info": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "text": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "textMuted": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "background": {
      "dark": "#292d3e",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#32364a",
      "light": "#e7e7e8"
    },
    "border": {
      "dark": "#32364a",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "borderSubtle": {
      "dark": "#1e2132",
      "light": "#eeeeee"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffContext": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "#91b859"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "#e53935"
    },
    "diffAddedBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e2132",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#a0a2af",
      "light": "#6a6e70"
    },
    "diffAddedLineNumberBg": {
      "dark": "#2e3c2b",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3c2b2b",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "markdownHeading": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#91b859"
    },
    "markdownBlockQuote": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "markdownHorizontalRule": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxComment": {
      "dark": "comment",
      "light": "#8796b0"
    },
    "syntaxKeyword": {
      "dark": "purple",
      "light": "#a854f2"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#4976eb"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#292d3e"
    },
    "syntaxString": {
      "dark": "green",
      "light": "#91b859"
    },
    "syntaxNumber": {
      "dark": "orange",
      "light": "#f4511e"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "#ffb300"
    },
    "syntaxOperator": {
      "dark": "cyan",
      "light": "#00acc1"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#292d3e"
    }
      }
    };
    const rosepine = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "base": "#191724",
    "surface": "#1f1d2e",
    "overlay": "#26233a",
    "muted": "#A6A4B5",
    "subtle": "#908caa",
    "text": "#e0def4",
    "love": "#eb6f92",
    "gold": "#f6c177",
    "rose": "#ebbcba",
    "pine": "#568DA3",
    "foam": "#9ccfd8",
    "iris": "#c4a7e7",
    "highlightLow": "#21202e",
    "highlightMed": "#403d52",
    "highlightHigh": "#524f67",
    "moonBase": "#232136",
    "moonSurface": "#2a273f",
    "moonOverlay": "#393552",
    "moonMuted": "#6e6a86",
    "moonSubtle": "#908caa",
    "moonText": "#e0def4",
    "dawnBase": "#faf4ed",
    "dawnSurface": "#fffaf3",
    "dawnOverlay": "#f2e9e1",
    "dawnMuted": "#9893a5",
    "dawnSubtle": "#797593",
    "dawnText": "#575279"
      },
      "theme": {
    "primary": {
      "dark": "foam",
      "light": "pine"
    },
    "secondary": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "accent": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "error": {
      "dark": "love",
      "light": "#b4637a"
    },
    "warning": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "success": {
      "dark": "pine",
      "light": "#286983"
    },
    "info": {
      "dark": "foam",
      "light": "#56949f"
    },
    "text": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "textMuted": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "background": {
      "dark": "base",
      "light": "dawnBase"
    },
    "backgroundPanel": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "backgroundElement": {
      "dark": "overlay",
      "light": "dawnOverlay"
    },
    "border": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "borderActive": {
      "dark": "foam",
      "light": "pine"
    },
    "borderSubtle": {
      "dark": "highlightLow",
      "light": "#f4ede8"
    },
    "diffAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffContext": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "diffHunkHeader": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "diffHighlightAdded": {
      "dark": "pine",
      "light": "#286983"
    },
    "diffHighlightRemoved": {
      "dark": "love",
      "light": "#b4637a"
    },
    "diffAddedBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "diffContextBg": {
      "dark": "surface",
      "light": "dawnSurface"
    },
    "diffLineNumber": {
      "dark": "#9491a6",
      "light": "#6c6875"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1f2d3a",
      "light": "#e5f2f3"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1f2d",
      "light": "#fce5e8"
    },
    "markdownText": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "markdownHeading": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "markdownLink": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownLinkText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCode": {
      "dark": "pine",
      "light": "#286983"
    },
    "markdownBlockQuote": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "markdownEmph": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "markdownStrong": {
      "dark": "love",
      "light": "#b4637a"
    },
    "markdownHorizontalRule": {
      "dark": "highlightMed",
      "light": "#dfdad9"
    },
    "markdownListItem": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownListEnumeration": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownImage": {
      "dark": "foam",
      "light": "pine"
    },
    "markdownImageText": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "markdownCodeBlock": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxComment": {
      "dark": "muted",
      "light": "dawnMuted"
    },
    "syntaxKeyword": {
      "dark": "pine",
      "light": "#286983"
    },
    "syntaxFunction": {
      "dark": "rose",
      "light": "#d7827e"
    },
    "syntaxVariable": {
      "dark": "#e0def4",
      "light": "#575279"
    },
    "syntaxString": {
      "dark": "gold",
      "light": "#ea9d34"
    },
    "syntaxNumber": {
      "dark": "iris",
      "light": "#907aa9"
    },
    "syntaxType": {
      "dark": "foam",
      "light": "#56949f"
    },
    "syntaxOperator": {
      "dark": "subtle",
      "light": "dawnSubtle"
    },
    "syntaxPunctuation": {
      "dark": "subtle",
      "light": "dawnSubtle"
    }
      }
    };
    const shadesofpurple = {
      "defs": {},
      "theme": {
    "background": {
      "dark": "#1A102B",
      "light": "#F7EBFF"
    },
    "backgroundPanel": {
      "dark": "#29203A",
      "light": "#EADEF3"
    },
    "backgroundElement": {
      "dark": "#392F49",
      "light": "#DDD0E8"
    },
    "text": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "textMuted": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "primary": {
      "dark": "#C792FF",
      "light": "#7455EB"
    },
    "secondary": {
      "dark": "#FF7AC6",
      "light": "#CA55A9"
    },
    "accent": {
      "dark": "#FF7AC6",
      "light": "#FF6BD5"
    },
    "error": {
      "dark": "#FF7AC6",
      "light": "#CA55A9"
    },
    "warning": {
      "dark": "#FFD580",
      "light": "#9A7D2D"
    },
    "success": {
      "dark": "#7BE0B0",
      "light": "#2A9268"
    },
    "info": {
      "dark": "#7DD4FF",
      "light": "#408AA6"
    },
    "border": {
      "dark": "#D2CCDD",
      "light": "#594B74"
    },
    "borderActive": {
      "dark": "#AFA8BB",
      "light": "#77698E"
    },
    "syntaxComment": {
      "dark": "#B363FF",
      "light": "#8043CC"
    },
    "syntaxKeyword": {
      "dark": "#FF9D00",
      "light": "#A14E00"
    },
    "syntaxFunction": {
      "dark": "#C792FF",
      "light": "#684CD3"
    },
    "syntaxVariable": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "syntaxString": {
      "dark": "#A5FF90",
      "light": "#277329"
    },
    "syntaxNumber": {
      "dark": "#FF628C",
      "light": "#AD3B5E"
    },
    "syntaxType": {
      "dark": "#FAD000",
      "light": "#7D6100"
    },
    "syntaxOperator": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "markdownLink": {
      "dark": "#FF7AC6",
      "light": "#9E4284"
    },
    "markdownHeading": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownCode": {
      "dark": "#C792FF",
      "light": "#684CD3"
    },
    "markdownEmph": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownStrong": {
      "dark": "#F5F0FF",
      "light": "#3B2C59"
    },
    "markdownBlockQuote": {
      "dark": "#B7B3C0",
      "light": "#423B4B"
    },
    "markdownHorizontalRule": {
      "dark": "#D2CCDD",
      "light": "#594B74"
    },
    "diffAdded": {
      "dark": "#7BE0B0",
      "light": "#3DD598"
    },
    "diffRemoved": {
      "dark": "#FF7AC6",
      "light": "#FF6BD5"
    },
    "diffAddedBg": {
      "dark": "#273745",
      "light": "#F0EDFA"
    },
    "diffRemovedBg": {
      "dark": "#442045",
      "light": "#F8E5FD"
    },
    "diffAddedLineNumberBg": {
      "dark": "#273745",
      "light": "#F0EDFA"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#442045",
      "light": "#F8E5FD"
    }
      }
    };
    const solarized = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "base03": "#002b36",
    "base02": "#073642",
    "base01": "#A9B5B8",
    "base00": "#657b83",
    "base0": "#B7C1C2",
    "base1": "#93a1a1",
    "base2": "#eee8d5",
    "base3": "#fdf6e3",
    "yellow": "#BB9315",
    "orange": "#DA815B",
    "red": "#DE3E3B",
    "magenta": "#E174A9",
    "violet": "#6D72C4",
    "blue": "#5FAADE",
    "cyan": "#39A89F",
    "green": "#8FA114"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "blue"
    },
    "secondary": {
      "dark": "violet",
      "light": "violet"
    },
    "accent": {
      "dark": "cyan",
      "light": "cyan"
    },
    "error": {
      "dark": "red",
      "light": "red"
    },
    "warning": {
      "dark": "yellow",
      "light": "yellow"
    },
    "success": {
      "dark": "green",
      "light": "green"
    },
    "info": {
      "dark": "orange",
      "light": "orange"
    },
    "text": {
      "dark": "base0",
      "light": "base00"
    },
    "textMuted": {
      "dark": "base01",
      "light": "base1"
    },
    "background": {
      "dark": "base03",
      "light": "base3"
    },
    "backgroundPanel": {
      "dark": "base02",
      "light": "base2"
    },
    "backgroundElement": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "border": {
      "dark": "base02",
      "light": "base2"
    },
    "borderActive": {
      "dark": "base01",
      "light": "base1"
    },
    "borderSubtle": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffContext": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHunkHeader": {
      "dark": "base01",
      "light": "base1"
    },
    "diffHighlightAdded": {
      "dark": "green",
      "light": "green"
    },
    "diffHighlightRemoved": {
      "dark": "red",
      "light": "red"
    },
    "diffAddedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffContextBg": {
      "dark": "base02",
      "light": "base2"
    },
    "diffLineNumber": {
      "dark": "#8b9b9f",
      "light": "#5f6969"
    },
    "diffAddedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#073642",
      "light": "#eee8d5"
    },
    "markdownText": {
      "dark": "base0",
      "light": "base00"
    },
    "markdownHeading": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownLinkText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCode": {
      "dark": "green",
      "light": "green"
    },
    "markdownBlockQuote": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "yellow"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "orange"
    },
    "markdownHorizontalRule": {
      "dark": "base01",
      "light": "base1"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "blue"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "cyan"
    },
    "markdownImageText": {
      "dark": "violet",
      "light": "violet"
    },
    "markdownCodeBlock": {
      "dark": "base0",
      "light": "base00"
    },
    "syntaxComment": {
      "dark": "base01",
      "light": "base1"
    },
    "syntaxKeyword": {
      "dark": "green",
      "light": "green"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "blue"
    },
    "syntaxVariable": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxString": {
      "dark": "cyan",
      "light": "cyan"
    },
    "syntaxNumber": {
      "dark": "magenta",
      "light": "magenta"
    },
    "syntaxType": {
      "dark": "yellow",
      "light": "yellow"
    },
    "syntaxOperator": {
      "dark": "green",
      "light": "green"
    },
    "syntaxPunctuation": {
      "dark": "base0",
      "light": "base00"
    }
      }
    };
    const synthwave84 = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background": "#262335",
    "backgroundAlt": "#1e1a29",
    "backgroundPanel": "#2a2139",
    "foreground": "#ffffff",
    "foregroundMuted": "#9EA3CB",
    "pink": "#ff7edb",
    "pinkBright": "#ff92df",
    "cyan": "#36f9f6",
    "cyanBright": "#72f1f8",
    "yellow": "#fede5d",
    "yellowBright": "#fff95d",
    "orange": "#ff8b39",
    "orangeBright": "#ff9f43",
    "purple": "#b084eb",
    "purpleBright": "#c792ea",
    "red": "#fe4450",
    "redBright": "#ff5e5b",
    "green": "#72f1b8",
    "greenBright": "#97f1d8"
      },
      "theme": {
    "primary": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "secondary": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "accent": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "error": {
      "dark": "red",
      "light": "#f44336"
    },
    "warning": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "success": {
      "dark": "green",
      "light": "#4caf50"
    },
    "info": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "text": {
      "dark": "foreground",
      "light": "#262335"
    },
    "textMuted": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "background": {
      "dark": "#262335",
      "light": "#fafafa"
    },
    "backgroundPanel": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "backgroundElement": {
      "dark": "#2a2139",
      "light": "#eeeeee"
    },
    "border": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "borderActive": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "borderSubtle": {
      "dark": "#241b2f",
      "light": "#f0f0f0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#4caf50"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#f44336"
    },
    "diffContext": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "diffHunkHeader": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#4caf50"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#f44336"
    },
    "diffAddedBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "diffContextBg": {
      "dark": "#1e1a29",
      "light": "#f5f5f5"
    },
    "diffLineNumber": {
      "dark": "#959bc1",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1a3a2a",
      "light": "#e8f5e9"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3a1a2a",
      "light": "#ffebee"
    },
    "markdownText": {
      "dark": "foreground",
      "light": "#262335"
    },
    "markdownHeading": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "markdownLink": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownLinkText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#4caf50"
    },
    "markdownBlockQuote": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "markdownEmph": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "markdownHorizontalRule": {
      "dark": "#495495",
      "light": "#e0e0e0"
    },
    "markdownListItem": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownListEnumeration": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownImage": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "markdownImageText": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "markdownCodeBlock": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxComment": {
      "dark": "foregroundMuted",
      "light": "#5c5c8a"
    },
    "syntaxKeyword": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxFunction": {
      "dark": "orange",
      "light": "#ff5722"
    },
    "syntaxVariable": {
      "dark": "foreground",
      "light": "#262335"
    },
    "syntaxString": {
      "dark": "yellow",
      "light": "#ff9800"
    },
    "syntaxNumber": {
      "dark": "purple",
      "light": "#9c27b0"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#00bcd4"
    },
    "syntaxOperator": {
      "dark": "pink",
      "light": "#e91e63"
    },
    "syntaxPunctuation": {
      "dark": "foreground",
      "light": "#262335"
    }
      }
    };
    const tokyonight = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "darkStep1": "#1a1b26",
    "darkStep2": "#1e2030",
    "darkStep3": "#222436",
    "darkStep4": "#292e42",
    "darkStep5": "#3b4261",
    "darkStep6": "#545c7e",
    "darkStep7": "#737aa2",
    "darkStep8": "#9099b2",
    "darkStep9": "#82aaff",
    "darkStep10": "#89b4fa",
    "darkStep11": "#9CA3C6",
    "darkStep12": "#c8d3f5",
    "darkRed": "#ff757f",
    "darkOrange": "#ff966c",
    "darkYellow": "#ffc777",
    "darkGreen": "#c3e88d",
    "darkCyan": "#86e1fc",
    "darkPurple": "#c099ff",
    "lightStep1": "#e1e2e7",
    "lightStep2": "#d5d6db",
    "lightStep3": "#c8c9ce",
    "lightStep4": "#b9bac1",
    "lightStep5": "#a8aecb",
    "lightStep6": "#9699a8",
    "lightStep7": "#737a8c",
    "lightStep8": "#5a607d",
    "lightStep9": "#2e7de9",
    "lightStep10": "#1a6ce7",
    "lightStep11": "#8990a3",
    "lightStep12": "#3760bf",
    "lightRed": "#f52a65",
    "lightOrange": "#b15c00",
    "lightYellow": "#8c6c3e",
    "lightGreen": "#587539",
    "lightCyan": "#007197",
    "lightPurple": "#9854f1"
      },
      "theme": {
    "primary": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "secondary": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "accent": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "error": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "warning": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "success": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "info": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "text": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "textMuted": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "background": {
      "dark": "darkStep1",
      "light": "lightStep1"
    },
    "backgroundPanel": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "backgroundElement": {
      "dark": "darkStep3",
      "light": "lightStep3"
    },
    "border": {
      "dark": "darkStep7",
      "light": "lightStep7"
    },
    "borderActive": {
      "dark": "darkStep8",
      "light": "lightStep8"
    },
    "borderSubtle": {
      "dark": "darkStep6",
      "light": "lightStep6"
    },
    "diffAdded": {
      "dark": "#4fd6be",
      "light": "#1e725c"
    },
    "diffRemoved": {
      "dark": "#c53b53",
      "light": "#c53b53"
    },
    "diffContext": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHunkHeader": {
      "dark": "#828bb8",
      "light": "#7086b5"
    },
    "diffHighlightAdded": {
      "dark": "#b8db87",
      "light": "#4db380"
    },
    "diffHighlightRemoved": {
      "dark": "#e26a75",
      "light": "#f52a65"
    },
    "diffAddedBg": {
      "dark": "#20303b",
      "light": "#d5e5d5"
    },
    "diffRemovedBg": {
      "dark": "#37222c",
      "light": "#f7d8db"
    },
    "diffContextBg": {
      "dark": "darkStep2",
      "light": "lightStep2"
    },
    "diffLineNumber": {
      "dark": "#8f909a",
      "light": "#59595b"
    },
    "diffAddedLineNumberBg": {
      "dark": "#1b2b34",
      "light": "#c5d5c5"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#2d1f26",
      "light": "#e7c8cb"
    },
    "markdownText": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "markdownHeading": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "markdownLink": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownLinkText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCode": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "markdownBlockQuote": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownEmph": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "markdownStrong": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "markdownHorizontalRule": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "markdownListItem": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownListEnumeration": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownImage": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "markdownImageText": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "markdownCodeBlock": {
      "dark": "darkStep12",
      "light": "lightStep12"
    },
    "syntaxComment": {
      "dark": "darkStep11",
      "light": "lightStep11"
    },
    "syntaxKeyword": {
      "dark": "darkPurple",
      "light": "lightPurple"
    },
    "syntaxFunction": {
      "dark": "darkStep9",
      "light": "lightStep9"
    },
    "syntaxVariable": {
      "dark": "darkRed",
      "light": "lightRed"
    },
    "syntaxString": {
      "dark": "darkGreen",
      "light": "lightGreen"
    },
    "syntaxNumber": {
      "dark": "darkOrange",
      "light": "lightOrange"
    },
    "syntaxType": {
      "dark": "darkYellow",
      "light": "lightYellow"
    },
    "syntaxOperator": {
      "dark": "darkCyan",
      "light": "lightCyan"
    },
    "syntaxPunctuation": {
      "dark": "darkStep12",
      "light": "lightStep12"
    }
      }
    };
    const vercel = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "background100": "#0A0A0A",
    "background200": "#000000",
    "gray100": "#1A1A1A",
    "gray200": "#1F1F1F",
    "gray300": "#292929",
    "gray400": "#2E2E2E",
    "gray500": "#727272",
    "gray600": "#AAAAAA",
    "gray700": "#8F8F8F",
    "gray900": "#A1A1A1",
    "gray1000": "#EDEDED",
    "blue600": "#0099FF",
    "blue700": "#006AE7",
    "blue900": "#52A8FF",
    "blue1000": "#EBF8FF",
    "red700": "#E5484D",
    "red900": "#FF6166",
    "red1000": "#FDECED",
    "amber700": "#FFB224",
    "amber900": "#F2A700",
    "amber1000": "#FDF4DC",
    "green700": "#46A758",
    "green900": "#63C46D",
    "green1000": "#E6F9E9",
    "teal700": "#12A594",
    "teal900": "#0AC7AC",
    "purple700": "#8E4EC6",
    "purple900": "#BF7AF0",
    "pink700": "#E93D82",
    "pink900": "#F75590",
    "highlightPink": "#FF0080",
    "highlightPurple": "#F81CE5",
    "cyan": "#50E3C2",
    "lightBackground": "#FFFFFF",
    "lightGray100": "#FAFAFA",
    "lightGray200": "#EAEAEA",
    "lightGray600": "#666666",
    "lightGray1000": "#171717"
      },
      "theme": {
    "primary": {
      "dark": "blue700",
      "light": "blue700"
    },
    "secondary": {
      "dark": "blue900",
      "light": "#0062D1"
    },
    "accent": {
      "dark": "purple700",
      "light": "purple700"
    },
    "error": {
      "dark": "red700",
      "light": "#DC3545"
    },
    "warning": {
      "dark": "amber700",
      "light": "#FF9500"
    },
    "success": {
      "dark": "green700",
      "light": "#388E3C"
    },
    "info": {
      "dark": "blue900",
      "light": "blue700"
    },
    "text": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "textMuted": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "background": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "backgroundPanel": {
      "dark": "gray100",
      "light": "lightGray100"
    },
    "backgroundElement": {
      "dark": "gray300",
      "light": "lightGray200"
    },
    "border": {
      "dark": "gray200",
      "light": "lightGray200"
    },
    "borderActive": {
      "dark": "gray500",
      "light": "#999999"
    },
    "borderSubtle": {
      "dark": "gray100",
      "light": "#EAEAEA"
    },
    "diffAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffContext": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHunkHeader": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "diffHighlightAdded": {
      "dark": "green900",
      "light": "green700"
    },
    "diffHighlightRemoved": {
      "dark": "red900",
      "light": "red700"
    },
    "diffAddedBg": {
      "dark": "#0B1D0F",
      "light": "#E6F9E9"
    },
    "diffRemovedBg": {
      "dark": "#2A1314",
      "light": "#FDECED"
    },
    "diffContextBg": {
      "dark": "background200",
      "light": "lightBackground"
    },
    "diffLineNumber": {
      "dark": "#8a8a8a",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0F2613",
      "light": "#D6F5D6"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#3C1618",
      "light": "#FFE5E5"
    },
    "markdownText": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownHeading": {
      "dark": "purple900",
      "light": "purple700"
    },
    "markdownLink": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownLinkText": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownCode": {
      "dark": "green900",
      "light": "green700"
    },
    "markdownBlockQuote": {
      "dark": "gray600",
      "light": "lightGray600"
    },
    "markdownEmph": {
      "dark": "amber900",
      "light": "amber700"
    },
    "markdownStrong": {
      "dark": "pink900",
      "light": "pink700"
    },
    "markdownHorizontalRule": {
      "dark": "gray500",
      "light": "#999999"
    },
    "markdownListItem": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "markdownListEnumeration": {
      "dark": "blue900",
      "light": "blue700"
    },
    "markdownImage": {
      "dark": "teal900",
      "light": "teal700"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "teal700"
    },
    "markdownCodeBlock": {
      "dark": "gray1000",
      "light": "lightGray1000"
    },
    "syntaxComment": {
      "dark": "gray600",
      "light": "#888888"
    },
    "syntaxKeyword": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxFunction": {
      "dark": "purple900",
      "light": "purple700"
    },
    "syntaxVariable": {
      "dark": "blue900",
      "light": "blue700"
    },
    "syntaxString": {
      "dark": "green900",
      "light": "green700"
    },
    "syntaxNumber": {
      "dark": "amber900",
      "light": "amber700"
    },
    "syntaxType": {
      "dark": "teal900",
      "light": "teal700"
    },
    "syntaxOperator": {
      "dark": "pink900",
      "light": "pink700"
    },
    "syntaxPunctuation": {
      "dark": "gray1000",
      "light": "lightGray1000"
    }
      }
    };
    const vesper = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "vesperBg": "#101010",
    "vesperFg": "#FFF",
    "vesperComment": "#8b8b8b",
    "vesperKeyword": "#A0A0A0",
    "vesperFunction": "#FFC799",
    "vesperString": "#99FFE4",
    "vesperNumber": "#FFC799",
    "vesperError": "#FF8080",
    "vesperWarning": "#FFC799",
    "vesperSuccess": "#99FFE4",
    "vesperMuted": "#A0A0A0"
      },
      "theme": {
    "primary": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "secondary": {
      "dark": "#99FFE4",
      "light": "#99FFE4"
    },
    "accent": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "error": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "warning": {
      "dark": "vesperWarning",
      "light": "vesperWarning"
    },
    "success": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "info": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "text": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "textMuted": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "background": {
      "dark": "vesperBg",
      "light": "#FFF"
    },
    "backgroundPanel": {
      "dark": "vesperBg",
      "light": "#F0F0F0"
    },
    "backgroundElement": {
      "dark": "vesperBg",
      "light": "#E0E0E0"
    },
    "border": {
      "dark": "#282828",
      "light": "#D0D0D0"
    },
    "borderActive": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "borderSubtle": {
      "dark": "#1C1C1C",
      "light": "#E8E8E8"
    },
    "diffAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffContext": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHunkHeader": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "diffHighlightAdded": {
      "dark": "vesperSuccess",
      "light": "vesperSuccess"
    },
    "diffHighlightRemoved": {
      "dark": "vesperError",
      "light": "vesperError"
    },
    "diffAddedBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "diffContextBg": {
      "dark": "vesperBg",
      "light": "#F8F8F8"
    },
    "diffLineNumber": {
      "dark": "textMuted",
      "light": "#6a6a6a"
    },
    "diffAddedLineNumberBg": {
      "dark": "#0d2818",
      "light": "#e8f5e8"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#281a1a",
      "light": "#f5e8e8"
    },
    "markdownText": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHeading": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLink": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownLinkText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCode": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownBlockQuote": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownEmph": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownStrong": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownHorizontalRule": {
      "dark": "#65737E",
      "light": "#65737E"
    },
    "markdownListItem": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownListEnumeration": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "markdownImage": {
      "dark": "#FFC799",
      "light": "#FFC799"
    },
    "markdownImageText": {
      "dark": "vesperMuted",
      "light": "vesperMuted"
    },
    "markdownCodeBlock": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxComment": {
      "dark": "vesperComment",
      "light": "vesperComment"
    },
    "syntaxKeyword": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxFunction": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxVariable": {
      "dark": "vesperFg",
      "light": "vesperBg"
    },
    "syntaxString": {
      "dark": "vesperString",
      "light": "vesperString"
    },
    "syntaxNumber": {
      "dark": "vesperNumber",
      "light": "vesperNumber"
    },
    "syntaxType": {
      "dark": "vesperFunction",
      "light": "vesperFunction"
    },
    "syntaxOperator": {
      "dark": "vesperKeyword",
      "light": "vesperKeyword"
    },
    "syntaxPunctuation": {
      "dark": "vesperFg",
      "light": "vesperBg"
    }
      }
    };
    const zenburn = {
      "$schema": "https://opencode.ai/theme.json",
      "defs": {
    "bg": "#3F3F3F",
    "bgAlt": "#474747",
    "bgPanel": "#4E4E4E",
    "fg": "#E9E9DE",
    "fgMuted": "#DBDBDB",
    "red": "#D7AAAA",
    "redBright": "#dca3a3",
    "green": "#A4BBA4",
    "greenBright": "#9EBD9E",
    "yellow": "#f0dfaf",
    "yellowDim": "#e0cf9f",
    "blue": "#8cd0d3",
    "blueDim": "#7cb8bb",
    "magenta": "#dc8cc3",
    "cyan": "#93e0e3",
    "orange": "#dfaf8f"
      },
      "theme": {
    "primary": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "secondary": {
      "dark": "magenta",
      "light": "#8f5f8f"
    },
    "accent": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "error": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "warning": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "success": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "info": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "text": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "textMuted": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "background": {
      "dark": "bg",
      "light": "#ffffef"
    },
    "backgroundPanel": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "backgroundElement": {
      "dark": "bgPanel",
      "light": "#ebebdb"
    },
    "border": {
      "dark": "#5f5f5f",
      "light": "#d0d0c0"
    },
    "borderActive": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "borderSubtle": {
      "dark": "#4f4f4f",
      "light": "#e0e0d0"
    },
    "diffAdded": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "diffRemoved": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "diffContext": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "diffHunkHeader": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "diffHighlightAdded": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "diffHighlightRemoved": {
      "dark": "redBright",
      "light": "#8f5f5f"
    },
    "diffAddedBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "diffContextBg": {
      "dark": "bgAlt",
      "light": "#f5f5e5"
    },
    "diffLineNumber": {
      "dark": "#d2d2d2",
      "light": "textMuted"
    },
    "diffAddedLineNumberBg": {
      "dark": "#4f5f4f",
      "light": "#efffef"
    },
    "diffRemovedLineNumberBg": {
      "dark": "#5f4f4f",
      "light": "#ffefef"
    },
    "markdownText": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "markdownHeading": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "markdownLink": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownLinkText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCode": {
      "dark": "green",
      "light": "#5f8f5f"
    },
    "markdownBlockQuote": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownEmph": {
      "dark": "yellowDim",
      "light": "#8f8f5f"
    },
    "markdownStrong": {
      "dark": "orange",
      "light": "#8f7f5f"
    },
    "markdownHorizontalRule": {
      "dark": "fgMuted",
      "light": "#6f6f6f"
    },
    "markdownListItem": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownListEnumeration": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownImage": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "markdownImageText": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "markdownCodeBlock": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxComment": {
      "dark": "#A4BBA4",
      "light": "#5f7f5f"
    },
    "syntaxKeyword": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxFunction": {
      "dark": "blue",
      "light": "#5f7f8f"
    },
    "syntaxVariable": {
      "dark": "fg",
      "light": "#3f3f3f"
    },
    "syntaxString": {
      "dark": "red",
      "light": "#8f5f5f"
    },
    "syntaxNumber": {
      "dark": "greenBright",
      "light": "#5f8f5f"
    },
    "syntaxType": {
      "dark": "cyan",
      "light": "#5f8f8f"
    },
    "syntaxOperator": {
      "dark": "yellow",
      "light": "#8f8f5f"
    },
    "syntaxPunctuation": {
      "dark": "fg",
      "light": "#3f3f3f"
    }
      }
    };

    const THEMES = {
      "amoled": amoled,
      "aura": aura,
      "ayu": ayu,
      "carbonfox": carbonfox,
      "catppuccin-frappe": catppuccin_frappe,
      "catppuccin-macchiato": catppuccin_macchiato,
      "catppuccin": catppuccin,
      "cobalt2": cobalt2,
      "cursor": cursor,
      "dracula": dracula,
      "everforest": everforest,
      "flexoki": flexoki,
      "github": github,
      "gruvbox": gruvbox,
      "kanagawa": kanagawa,
      "lucent-orng": lucent_orng,
      "material": material,
      "matrix": matrix,
      "mercury": mercury,
      "monokai": monokai,
      "nightowl": nightowl,
      "nord": nord,
      "oc-2": oc_2,
      "one-dark": one_dark,
      "onedarkpro": onedarkpro,
      "opencode": opencode,
      "orng": orng,
      "osaka-jade": osaka_jade,
      "palenight": palenight,
      "rosepine": rosepine,
      "shadesofpurple": shadesofpurple,
      "solarized": solarized,
      "synthwave84": synthwave84,
      "tokyonight": tokyonight,
      "vercel": vercel,
      "vesper": vesper,
      "zenburn": zenburn,
    };

    // —— 25 套 IP 预置（自定义主题的「选基底」来源，不进主列表）——
    const ip_cyberpunk_2077 = {"appearance": "dark", "basePreset": "cyberpunk-2077", "colors": {"background": "#151112", "backgroundElement": "#2C2829", "backgroundPanel": "#231B19", "border": "#625B51", "borderActive": "#FFF847", "bubbleBg": "#2A231D", "codeBlockBg": "#0E0A0B", "codeHeaderBg": "#100B08", "diffAdded": "#91A657", "diffAddedBg": "#14170C", "diffAddedLineNumberBg": "#1D2111", "diffRemoved": "#FF1932", "diffRemovedBg": "#240407", "diffRemovedLineNumberBg": "#36050B", "error": "#FF1932", "info": "#4A96B8", "inputBg": "#261F1B", "markdownBlockQuote": "#89929E", "markdownCode": "#B7D072", "markdownEmph": "#E1BF9A", "markdownHeading": "#E8DF04", "markdownLink": "#84CFEF", "markdownStrong": "#E6D7BA", "primary": "#FBF405", "secondary": "#D51666", "sidebarBg": "#1C1616", "success": "#CDED66", "syntaxComment": "#847C6A", "syntaxFunction": "#B8ECFA", "syntaxKeyword": "#C3B50C", "syntaxNumber": "#AD7B3E", "syntaxOperator": "#7876A5", "syntaxString": "#A2B772", "syntaxType": "#7A9E92", "text": "#C2BFB0", "textMuted": "#A7B4BC", "warning": "#E7A257"}, "id": "cyberpunk-2077", "name": "赛博朋克2077", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_dc_comics = {"appearance":"dark","basePreset":"dc-comics","colors":{"background":"#0C1326","backgroundElement":"#263356","backgroundPanel":"#09203F","border":"#7C7D7F","borderActive":"#D6F0FF","bubbleBg":"#0F437D","codeBlockBg":"#000515","codeHeaderBg":"#122543","diffAdded":"#8BB551","diffAddedBg":"#131B0E","diffAddedLineNumberBg":"#0A0F12","diffRemoved":"#D37B6D","diffRemovedBg":"#221A17","diffRemovedLineNumberBg":"#18100D","error":"#BE4B48","info":"#91C1CF","inputBg":"#192D52","markdownBlockQuote":"#A3BDD6","markdownCode":"#ECD1B4","markdownEmph":"#82BBE8","markdownHeading":"#B8D8ED","markdownLink":"#0392CE","markdownStrong":"#FFFFFF","primary":"#0373B3","secondary":"#E4BA56","sidebarBg":"#0A0F12","success":"#64AB65","syntaxComment":"#717F8A","syntaxFunction":"#008AC9","syntaxKeyword":"#BDA3B0","syntaxNumber":"#E6B189","syntaxOperator":"#7D7875","syntaxString":"#89BF81","syntaxType":"#BEDCDE","text":"#FEFAD4","textMuted":"#BDC0C5","warning":"#C2A595"},"id":"dc-comics","name":"DC","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T12:05:00+08:00"};
    const ip_disney = {"appearance": "light", "basePreset": "disney", "colors": {"background": "#DEEAF1", "backgroundElement": "#C9D6DE", "backgroundPanel": "#CDE2EC", "border": "#9AB4C1", "borderActive": "#876B31", "bubbleBg": "#EEF2F7", "codeBlockBg": "#F4F4F9", "codeHeaderBg": "#D0DBE3", "diffAdded": "#355132", "diffAddedBg": "#DEE9E3", "diffAddedLineNumberBg": "#CADFD0", "diffRemoved": "#872F3A", "diffRemovedBg": "#EDDDE1", "diffRemovedLineNumberBg": "#E3C1C6", "error": "#B12C34", "info": "#1C63A6", "inputBg": "#E5EDF4", "markdownBlockQuote": "#3C5873", "markdownCode": "#7A2137", "markdownEmph": "#7C537F", "markdownHeading": "#301C4A", "markdownLink": "#114586", "markdownStrong": "#240E33", "primary": "#903B5C", "secondary": "#3E7389", "sidebarBg": "#D6E6EF", "success": "#457245", "syntaxComment": "#676890", "syntaxFunction": "#2C597B", "syntaxKeyword": "#6E2645", "syntaxNumber": "#874B36", "syntaxOperator": "#756361", "syntaxString": "#316057", "syntaxType": "#503661", "text": "#071A49", "textMuted": "#31346A", "warning": "#AF543D"}, "id": "disney", "name": "迪士尼", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:15:00+08:00"};
    const ip_doraemon = {"appearance": "light", "basePreset": "doraemon", "colors": {"background": "#EFF9FF", "backgroundElement": "#AEE2FE", "backgroundPanel": "#D0EFFF", "border": "#B7DDF4", "borderActive": "#025DA1", "bubbleBg": "#E4F6FF", "codeBlockBg": "#C5EBFF", "codeHeaderBg": "#B9E7FE", "diffAdded": "#36473D", "diffAddedBg": "#E8EFEA", "diffAddedLineNumberBg": "#D7E2DA", "diffRemoved": "#7D141A", "diffRemovedBg": "#FDE4E5", "diffRemovedLineNumberBg": "#FBD1D3", "error": "#6F1319", "info": "#2D61A1", "inputBg": "#FBFDFF", "markdownBlockQuote": "#666666", "markdownCode": "#7B4F42", "markdownEmph": "#843F59", "markdownHeading": "#056D96", "markdownLink": "#063F6B", "markdownStrong": "#0C0C10", "primary": "#135F7B", "secondary": "#9E7F09", "sidebarBg": "#DBF2FF", "success": "#496352", "syntaxComment": "#626262", "syntaxFunction": "#204069", "syntaxKeyword": "#821823", "syntaxNumber": "#5A3B34", "syntaxOperator": "#4B5B62", "syntaxString": "#3E5345", "syntaxType": "#175B7B", "text": "#1A1617", "textMuted": "#202E42", "warning": "#733D18"}, "id": "doraemon", "name": "哆啦A梦", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T11:51:21+08:00"};
    const ip_dragon_ball = {"appearance":"light","basePreset":"dragon-ball","colors":{"background":"#FAF1EA","backgroundElement":"#F0ECE3","backgroundPanel":"#F5E2D1","border":"#A38040","borderActive":"#103347","bubbleBg":"#FFFFFF","codeBlockBg":"#F7DEC0","codeHeaderBg":"#F0C59B","diffAdded":"#0A3325","diffAddedBg":"#D1C3A7","diffAddedLineNumberBg":"#B9B298","diffRemoved":"#330C07","diffRemovedBg":"#D8BCA2","diffRemovedLineNumberBg":"#C4A790","error":"#6B1C21","info":"#266670","inputBg":"#FDFDFD","markdownBlockQuote":"#4E5752","markdownCode":"#6B2800","markdownEmph":"#614834","markdownHeading":"#704010","markdownLink":"#2B4D66","markdownStrong":"#120C0E","primary":"#BD3C03","secondary":"#194E70","sidebarBg":"#EDC89B","success":"#367036","syntaxComment":"#70615C","syntaxFunction":"#664C19","syntaxKeyword":"#42365C","syntaxNumber":"#61435F","syntaxOperator":"#756148","syntaxString":"#612B05","syntaxType":"#335C22","text":"#241913","textMuted":"#573E2A","warning":"#7A4C00"},"id":"dragon-ball","name":"龙珠","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T11:20:00+08:00"};
    const ip_evangelion = {"appearance": "dark", "basePreset": "evangelion", "colors": {"background": "#151419", "backgroundElement": "#1E2B50", "backgroundPanel": "#111B3E", "border": "#382A5F", "borderActive": "#7A91BA", "bubbleBg": "#212558", "codeBlockBg": "#1F1D32", "codeHeaderBg": "#2B334F", "diffAdded": "#AFC755", "diffAddedBg": "#2A2D2A", "diffAddedLineNumberBg": "#212227", "diffRemoved": "#D78A90", "diffRemovedBg": "#2F1D25", "diffRemovedLineNumberBg": "#241A24", "error": "#E3796A", "info": "#7DA0D8", "inputBg": "#141520", "markdownBlockQuote": "#BAC6DC", "markdownCode": "#CAA0B3", "markdownEmph": "#97AD50", "markdownHeading": "#FAAB00", "markdownLink": "#A1CCF6", "markdownStrong": "#FEFEFE", "primary": "#BB96F5", "secondary": "#BEAFCF", "sidebarBg": "#282242", "success": "#DBFD68", "syntaxComment": "#8B8996", "syntaxFunction": "#C2DEF4", "syntaxKeyword": "#B4B3D0", "syntaxNumber": "#F9B219", "syntaxOperator": "#7D90AC", "syntaxString": "#89B872", "syntaxType": "#DEBAC7", "text": "#D5D8DE", "textMuted": "#CEBEBD", "warning": "#B2750A"}, "id": "evangelion", "name": "新世纪福音战士", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T11:00:00+08:00"};
    const ip_evangelion_day = {"appearance": "light", "basePreset": "evangelion-day", "colors": {"background": "#EFF2F7", "backgroundElement": "#E8E8F2", "backgroundPanel": "#FEFEFE", "border": "#87AFE3", "borderActive": "#382A5F", "bubbleBg": "#DDD3F6", "codeBlockBg": "#C9E1F4", "codeHeaderBg": "#A9C3E0", "diffAdded": "#2B4429", "diffAddedBg": "#E5EBDD", "diffAddedLineNumberBg": "#F8FAF9", "diffRemoved": "#4D2638", "diffRemovedBg": "#EDDEDE", "diffRemovedLineNumberBg": "#EACAC6", "error": "#422329", "info": "#0F2242", "inputBg": "#CAD0D8", "markdownBlockQuote": "#4A5164", "markdownCode": "#67575A", "markdownEmph": "#525D38", "markdownHeading": "#5D4523", "markdownLink": "#0044A0", "markdownStrong": "#111B3E", "primary": "#473D94", "secondary": "#3D3660", "sidebarBg": "#CCD5E5", "success": "#344D2C", "syntaxComment": "#2E5891", "syntaxFunction": "#414F63", "syntaxKeyword": "#564A77", "syntaxNumber": "#604C29", "syntaxOperator": "#4F4A9A", "syntaxString": "#243A2E", "syntaxType": "#4F3F47", "text": "#181824", "textMuted": "#282A45", "warning": "#785614"}, "id": "evangelion-day", "name": "新世纪福音战士·晴空", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_genshin = {"appearance":"light","basePreset":"genshin","colors":{"background":"#F4E9D4","backgroundElement":"#EEDCBC","backgroundPanel":"#E9DEC3","border":"#DCCEB2","borderActive":"#8F6F55","bubbleBg":"#F5E2D7","codeBlockBg":"#F3ECE0","codeHeaderBg":"#E5CFAC","diffAdded":"#45554D","diffAddedBg":"#E9DDC1","diffAddedLineNumberBg":"#D0CEB4","diffRemoved":"#9F3721","diffRemovedBg":"#EFD9BC","diffRemovedLineNumberBg":"#EAC9AC","error":"#92331F","info":"#4E658C","inputBg":"#F5F3EF","markdownBlockQuote":"#664F45","markdownCode":"#65463B","markdownEmph":"#526157","markdownHeading":"#2E375A","markdownLink":"#435982","markdownStrong":"#442920","primary":"#2A3B6B","secondary":"#9A7855","sidebarBg":"#D7C19E","success":"#49655A","syntaxComment":"#73594B","syntaxFunction":"#51554D","syntaxKeyword":"#2E345E","syntaxNumber":"#6B513C","syntaxOperator":"#595745","syntaxString":"#514D6E","syntaxType":"#394E7A","text":"#402C27","textMuted":"#553E38","warning":"#7F6247"},"id":"genshin","name":"原神","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:42:22+08:00"};
    const ip_genshin_night = {"appearance":"dark","basePreset":"genshin-night","colors":{"background":"#432E27","backgroundElement":"#3B3533","backgroundPanel":"#352427","border":"#7A6C5C","borderActive":"#E2C49D","bubbleBg":"#3F3F3A","codeBlockBg":"#2F1F29","codeHeaderBg":"#473733","diffAdded":"#7D9D8B","diffAddedBg":"#2E2E2A","diffAddedLineNumberBg":"#333632","diffRemoved":"#D28B7C","diffRemovedBg":"#302C28","diffRemovedLineNumberBg":"#442824","error":"#CE8070","info":"#9FC0CF","inputBg":"#2E2B28","markdownBlockQuote":"#B8AD93","markdownCode":"#B69571","markdownEmph":"#77A398","markdownHeading":"#B1CEE0","markdownLink":"#93B4C8","markdownStrong":"#E8DCC1","primary":"#8EA793","secondary":"#DCB581","sidebarBg":"#392D27","success":"#6D9689","syntaxComment":"#998776","syntaxFunction":"#85B0A6","syntaxKeyword":"#BAD8E3","syntaxNumber":"#DDBD8E","syntaxOperator":"#948C76","syntaxString":"#8490C3","syntaxType":"#93A4CB","text":"#F5E5D0","textMuted":"#C6BBA1","warning":"#DDAA77"},"id":"genshin-night","name":"原神·夜航","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_harry_potter = {"appearance": "dark", "basePreset": "harry-potter", "colors": {"background": "#0B223B", "backgroundElement": "#16374F", "backgroundPanel": "#102A45", "border": "#415366", "borderActive": "#FCDB8C", "bubbleBg": "#133250", "codeBlockBg": "#050F1A", "codeHeaderBg": "#1B3F5E", "diffAdded": "#A9CCC0", "diffAddedBg": "#233E50", "diffAddedLineNumberBg": "#395762", "diffRemoved": "#D9A1A3", "diffRemovedBg": "#2C3045", "diffRemovedLineNumberBg": "#4A3C4E", "error": "#E05A55", "info": "#3DD3FF", "inputBg": "#0D2740", "markdownBlockQuote": "#939CA5", "markdownCode": "#E0BE5C", "markdownEmph": "#C5B3C4", "markdownHeading": "#FFDAB5", "markdownLink": "#8BDBFE", "markdownStrong": "#FEFEFE", "primary": "#CAA654", "secondary": "#C56F72", "sidebarBg": "#071523", "success": "#91BEAE", "syntaxComment": "#80807E", "syntaxFunction": "#2E9FD0", "syntaxKeyword": "#AC93AA", "syntaxNumber": "#BB8964", "syntaxOperator": "#73818E", "syntaxString": "#599CB6", "syntaxType": "#79C7D2", "text": "#EEEEEC", "textMuted": "#BABAB8", "warning": "#D4A681"}, "id": "harry-potter", "name": "哈利波特", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:20:00+08:00"};
    const ip_hello_kitty = {"appearance": "light", "basePreset": "hello-kitty", "colors": {"background": "#FFFFFF", "backgroundElement": "#FAD8E3", "backgroundPanel": "#FBE6EF", "border": "#F4B4D0", "borderActive": "#C8152D", "bubbleBg": "#EE86A7", "codeBlockBg": "#FFFFFF", "codeHeaderBg": "#F4B4D0", "diffAdded": "#1E452E", "diffAddedBg": "#DEF4EA", "diffAddedLineNumberBg": "#CBEDDE", "diffRemoved": "#9F1627", "diffRemovedBg": "#F8CEDD", "diffRemovedLineNumberBg": "#F4B4D0", "error": "#B00C3F", "info": "#4F86C5", "inputBg": "#FBE6EF", "markdownBlockQuote": "#565656", "markdownCode": "#7F5D3B", "markdownEmph": "#596E72", "markdownHeading": "#9D274C", "markdownLink": "#2663AE", "markdownStrong": "#000000", "primary": "#C8152D", "secondary": "#0E52A5", "sidebarBg": "#EEA9BC", "success": "#1B6A42", "syntaxComment": "#737378", "syntaxFunction": "#446A99", "syntaxKeyword": "#D12E63", "syntaxNumber": "#705235", "syntaxOperator": "#966E45", "syntaxString": "#1A7548", "syntaxType": "#14417A", "text": "#231815", "textMuted": "#40404A", "warning": "#91720D"}, "id": "hello-kitty", "name": "HelloKitty", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_kuromi = {"appearance": "light", "basePreset": "kuromi", "colors": {"background": "#F4ECFA", "backgroundElement": "#E2D2EE", "backgroundPanel": "#ECE0F5", "border": "#DCCAE9", "borderActive": "#8D6AAE", "bubbleBg": "#FBDFED", "codeBlockBg": "#FBF7FD", "codeHeaderBg": "#EEE2F5", "diffAdded": "#1B7150", "diffAddedBg": "#E1F3E9", "diffAddedLineNumberBg": "#CCEBD9", "diffRemoved": "#a31638", "diffRemovedBg": "#FBE4EC", "diffRemovedLineNumberBg": "#F5D1DE", "error": "#A81B38", "info": "#4A52B4", "inputBg": "#FCF9FE", "markdownBlockQuote": "#775B84", "markdownCode": "#8E2A62", "markdownEmph": "#A63D70", "markdownHeading": "#552A6B", "markdownLink": "#7441A8", "markdownStrong": "#1B1123", "primary": "#BD3064", "secondary": "#a84ab2", "sidebarBg": "#EBDEF4", "success": "#256B57", "syntaxComment": "#736379", "syntaxFunction": "#6E49A8", "syntaxKeyword": "#ad386b", "syntaxNumber": "#96521A", "syntaxOperator": "#7C5F90", "syntaxString": "#2c6f5d", "syntaxType": "#4A5AA8", "text": "#241A2C", "textMuted": "#45384d", "warning": "#7E5610"}, "id": "kuromi", "name": "库洛米", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-19T23:05:00+08:00"};
    const ip_lego = {"appearance": "light", "basePreset": "lego", "colors": {"background": "#edeef0", "backgroundElement": "#d7d8dc", "backgroundPanel": "#f6f6f7", "border": "#c9cacf", "borderActive": "#a80d0f", "bubbleBg": "#ffffff", "codeBlockBg": "#e3e5e9", "codeHeaderBg": "#d9dce2", "diffAdded": "#1b6c2d", "diffAddedBg": "#d9f2e3", "diffAddedLineNumberBg": "#c4e9d3", "diffRemoved": "#9b194c", "diffRemovedBg": "#f9dfe7", "diffRemovedLineNumberBg": "#f0c3d3", "error": "#a01a4e", "info": "#087080", "inputBg": "#fbfbfc", "markdownBlockQuote": "#686b71", "markdownCode": "#6d28d9", "markdownEmph": "#5a5e64", "markdownHeading": "#2e3238", "markdownLink": "#0055bf", "markdownStrong": "#141416", "primary": "#d01012", "secondary": "#ae8000", "sidebarBg": "#e2e3e7", "success": "#1e7e34", "syntaxComment": "#5c6065", "syntaxFunction": "#6d581a", "syntaxKeyword": "#7f4389", "syntaxNumber": "#4d5f1e", "syntaxOperator": "#625e56", "syntaxString": "#356239", "syntaxType": "#2c5c90", "text": "#1a1a1b", "textMuted": "#383a3d", "warning": "#b34700"}, "id": "lego", "name": "乐高", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-19T23:05:00+08:00"};
    const ip_mario = {"appearance": "light", "basePreset": "mario", "colors": {"background": "#F5F9FF", "backgroundElement": "#EAF2FF", "backgroundPanel": "#EFF5FF", "border": "#C7DBFF", "borderActive": "#4E7BCE", "bubbleBg": "#E5EFFF", "codeBlockBg": "#F8FAFF", "codeHeaderBg": "#EDF3FF", "diffAdded": "#134407", "diffAddedBg": "#E6F6E6", "diffAddedLineNumberBg": "#BDE9BD", "diffRemoved": "#AB4108", "diffRemovedBg": "#FBEFE9", "diffRemovedLineNumberBg": "#F5DACB", "error": "#94210D", "info": "#486EB6", "inputBg": "#FAFCFF", "markdownBlockQuote": "#7E5A52", "markdownCode": "#584036", "markdownEmph": "#903809", "markdownHeading": "#173D7D", "markdownLink": "#B6260E", "markdownStrong": "#000000", "primary": "#C7280E", "secondary": "#0C4BAA", "sidebarBg": "#F2F7FF", "success": "#0D6305", "syntaxComment": "#7A726E", "syntaxFunction": "#335687", "syntaxKeyword": "#A8240D", "syntaxNumber": "#8E5522", "syntaxOperator": "#736B67", "syntaxString": "#7E370B", "syntaxType": "#50720D", "text": "#1D100A", "textMuted": "#4F4540", "warning": "#6F5803"}, "id": "mario", "name": "超级马里奥", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:30:00+08:00"};
    const ip_mario_night = {"appearance": "dark", "basePreset": "mario-night", "colors": {"background": "#060A12", "backgroundElement": "#0E1829", "backgroundPanel": "#0B121F", "border": "#40302D", "borderActive": "#5A96FF", "bubbleBg": "#0C1421", "codeBlockBg": "#04060A", "codeHeaderBg": "#05080E", "diffAdded": "#00AA00", "diffAddedBg": "#001A00", "diffAddedLineNumberBg": "#002500", "diffRemoved": "#E2421F", "diffRemovedBg": "#210600", "diffRemovedLineNumberBg": "#310900", "error": "#F7470E", "info": "#3F69B2", "inputBg": "#080E17", "markdownBlockQuote": "#B69892", "markdownCode": "#B89179", "markdownEmph": "#F7DC66", "markdownHeading": "#B5D0FF", "markdownLink": "#63A7F2", "markdownStrong": "#FFEFEC", "primary": "#C32300", "secondary": "#4284DA", "sidebarBg": "#090F1A", "success": "#84D310", "syntaxComment": "#A37A74", "syntaxFunction": "#529DF0", "syntaxKeyword": "#F34525", "syntaxNumber": "#FF9A39", "syntaxOperator": "#99726D", "syntaxString": "#AFE264", "syntaxType": "#F3CD24", "text": "#FFE2DE", "textMuted": "#C7948D", "warning": "#B69A1B"}, "id": "mario-night", "name": "超级马里奥·夜行", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_marvel = {"appearance":"dark","basePreset":"marvel","colors":{"background":"#0C0C10","backgroundElement":"#2D2D32","backgroundPanel":"#252529","border":"#40404A","borderActive":"#F11E22","bubbleBg":"#1C1C22","codeBlockBg":"#000000","codeHeaderBg":"#333337","diffAdded":"#40947D","diffAddedBg":"#171D14","diffAddedLineNumberBg":"#0D0D0F","diffRemoved":"#F56568","diffRemovedBg":"#4E1C26","diffRemovedLineNumberBg":"#331310","error":"#F77B7E","info":"#81B0DE","inputBg":"#18181C","markdownBlockQuote":"#B4B29F","markdownCode":"#C8AB7C","markdownEmph":"#F9A7A9","markdownHeading":"#F7E4AB","markdownLink":"#D4C794","markdownStrong":"#FFFFFF","primary":"#D32B28","secondary":"#EAC38D","sidebarBg":"#121216","success":"#62B59C","syntaxComment":"#7A7A7F","syntaxFunction":"#E4A05A","syntaxKeyword":"#F44A4D","syntaxNumber":"#A0A2AC","syntaxOperator":"#9D7A72","syntaxString":"#F0E5D8","syntaxType":"#FFCB05","text":"#EEEEF4","textMuted":"#BDBDC3","warning":"#DB7930"},"id":"marvel","name":"漫威","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T11:58:35+08:00"};
    const ip_naruto = {"appearance":"light","basePreset":"naruto","colors":{"background":"#F7F5EF","backgroundElement":"#E0D9C7","backgroundPanel":"#F0EDE8","border":"#C1C2C7","borderActive":"#1C578C","bubbleBg":"#FFDBDD","codeBlockBg":"#EBE6D6","codeHeaderBg":"#D0C5A7","diffAdded":"#134C3A","diffAddedBg":"#CFDFD8","diffAddedLineNumberBg":"#DDF8EC","diffRemoved":"#7D263A","diffRemovedBg":"#E2CDCE","diffRemovedLineNumberBg":"#FEEFF0","error":"#AB475A","info":"#407AA8","inputBg":"#FDFBF7","markdownBlockQuote":"#666B5F","markdownCode":"#7C3D18","markdownEmph":"#975A60","markdownHeading":"#203E74","markdownLink":"#0869A8","markdownStrong":"#171923","primary":"#A0542D","secondary":"#364364","sidebarBg":"#C4C0B4","success":"#477C68","syntaxComment":"#5A6A54","syntaxFunction":"#48609A","syntaxKeyword":"#823B29","syntaxNumber":"#5A5A03","syntaxOperator":"#66676D","syntaxString":"#335A4A","syntaxType":"#44668D","text":"#2B2D39","textMuted":"#3B3F4F","warning":"#6C6A25"},"id":"naruto","name":"火影忍者","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_naruto_night = {"appearance":"dark","basePreset":"naruto-night","colors":{"background":"#0A0E18","backgroundElement":"#232C3D","backgroundPanel":"#1E2334","border":"#38393F","borderActive":"#7CA3D6","bubbleBg":"#3A3746","codeBlockBg":"#121319","codeHeaderBg":"#27324F","diffAdded":"#ADE3CD","diffAddedBg":"#1D2D26","diffAddedLineNumberBg":"#294036","diffRemoved":"#EB929E","diffRemovedBg":"#352023","diffRemovedLineNumberBg":"#4D393A","error":"#D76979","info":"#7C8CA7","inputBg":"#1C1C2B","markdownBlockQuote":"#9A9BA2","markdownCode":"#E5A88C","markdownEmph":"#EDAAAF","markdownHeading":"#F0DC94","markdownLink":"#97B8E9","markdownStrong":"#FBFCFF","primary":"#EF9568","secondary":"#5C6D91","sidebarBg":"#181920","success":"#83A294","syntaxComment":"#82887D","syntaxFunction":"#8E9ED8","syntaxKeyword":"#F39984","syntaxNumber":"#C9C474","syntaxOperator":"#86868B","syntaxString":"#B2D3C6","syntaxType":"#6F8DBC","text":"#E7E8EC","textMuted":"#B1B3BC","warning":"#E2C377"},"id":"naruto-night","name":"火影忍者·暗部","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt": "2026-10-21T09:15:25+08:00"};
    const ip_one_piece = {"appearance":"light","basePreset":"one-piece","colors":{"background":"#E3F3FB","backgroundElement":"#9FD6F9","backgroundPanel":"#CEEBFA","border":"#C1E5FA","borderActive":"#866830","bubbleBg":"#E6F3FC","codeBlockBg":"#B4DFF9","codeHeaderBg":"#95D2F9","diffAdded":"#315847","diffAddedBg":"#EDF0B3","diffAddedLineNumberBg":"#DBE9BF","diffRemoved":"#51192D","diffRemovedBg":"#E6E1EB","diffRemovedLineNumberBg":"#E5D7E1","error":"#930B19","info":"#1B638A","inputBg":"#F2F6F9","markdownBlockQuote":"#2B5E90","markdownCode":"#105067","markdownEmph":"#703E22","markdownHeading":"#B21C2B","markdownLink":"#144DA5","markdownStrong":"#171D2E","primary":"#C32635","secondary":"#91774D","sidebarBg":"#C3E6FA","success":"#3B674E","syntaxComment":"#3C617F","syntaxFunction":"#6C5733","syntaxKeyword":"#A41523","syntaxNumber":"#553323","syntaxOperator":"#6A5B4C","syntaxString":"#284A41","syntaxType":"#164589","text":"#0F284B","textMuted":"#15355E","warning":"#934D20"},"id":"one-piece","name":"海贼王","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:45:00+08:00"};
    const ip_pokemon = {"appearance": "dark", "basePreset": "pokemon", "colors": {"background": "#1C1C22", "backgroundElement": "#48484D", "backgroundPanel": "#37373B", "border": "#40404A", "borderActive": "#FEED79", "bubbleBg": "#28282D", "codeBlockBg": "#0C0C10", "codeHeaderBg": "#58585A", "diffAdded": "#7FC9AE", "diffAddedBg": "#0A2828", "diffAddedLineNumberBg": "#191917", "diffRemoved": "#FE4C1C", "diffRemovedBg": "#0C0406", "diffRemovedLineNumberBg": "#141000", "error": "#F93D32", "info": "#289BCA", "inputBg": "#000000", "markdownBlockQuote": "#BDBDC3", "markdownCode": "#FDE7B5", "markdownEmph": "#F9B584", "markdownHeading": "#E3C371", "markdownLink": "#95C7F8", "markdownStrong": "#FFFFFF", "primary": "#FFCB05", "secondary": "#799DFE", "sidebarBg": "#060606", "success": "#7AA85D", "syntaxComment": "#85858A", "syntaxFunction": "#6E9BBC", "syntaxKeyword": "#C790A3", "syntaxNumber": "#C5A863", "syntaxOperator": "#7A7A7F", "syntaxString": "#80CAAF", "syntaxType": "#658F8B", "text": "#EEEEF4", "textMuted": "#D3D3D8", "warning": "#FB8603"}, "id": "pokemon", "name": "宝可梦", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:20:00+08:00"};
    const ip_sailor_moon = {"appearance": "light", "basePreset": "sailor-moon", "colors": {"background": "#ffeef5", "backgroundElement": "#fed1e5", "backgroundPanel": "#fed7e9", "border": "#ffe2ef", "borderActive": "#8b1b50", "bubbleBg": "#fff6fa", "codeBlockBg": "#ffe1ee", "codeHeaderBg": "#fedaea", "diffAdded": "#004144", "diffAddedBg": "#8dbabe", "diffAddedLineNumberBg": "#9cc3c6", "diffRemoved": "#78000c", "diffRemovedBg": "#f9cbcf", "diffRemovedLineNumberBg": "#fad3d6", "error": "#aa171f", "info": "#1659a7", "inputBg": "#ffe9f3", "markdownBlockQuote": "#5b4e76", "markdownCode": "#102e80", "markdownEmph": "#74284f", "markdownHeading": "#2e52a6", "markdownLink": "#2449ef", "markdownStrong": "#020a25", "primary": "#c51e56", "secondary": "#133284", "sidebarBg": "#ffdeed", "success": "#006d72", "syntaxComment": "#516384", "syntaxFunction": "#1830d8", "syntaxKeyword": "#9b003e", "syntaxNumber": "#6f4a00", "syntaxOperator": "#625477", "syntaxString": "#375d39", "syntaxType": "#025a7b", "text": "#041541", "textMuted": "#2e4066", "warning": "#845a00"}, "id": "sailor-moon", "name": "美少女战士", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:45:00+08:00"};
    const ip_star_wars = {"appearance": "dark", "basePreset": "star-wars", "colors": {"background": "#0F0814", "backgroundElement": "#2E2235", "backgroundPanel": "#211627", "border": "#41304B", "borderActive": "#7AD2FF", "bubbleBg": "#36293D", "codeBlockBg": "#0A050D", "codeHeaderBg": "#1A1020", "diffAdded": "#7DD2B5", "diffAddedBg": "#102822", "diffAddedLineNumberBg": "#183A31", "diffRemoved": "#D65166", "diffRemovedBg": "#2A0B11", "diffRemovedLineNumberBg": "#400709", "error": "#EB3D48", "info": "#97A5FE", "inputBg": "#271C2E", "markdownBlockQuote": "#7986C4", "markdownCode": "#FAEAD3", "markdownEmph": "#D17380", "markdownHeading": "#FCE39F", "markdownLink": "#78C1E9", "markdownStrong": "#F5FAFB", "primary": "#CD1E28", "secondary": "#30B4EC", "sidebarBg": "#150C1A", "success": "#6EC3AE", "syntaxComment": "#827893", "syntaxFunction": "#A5E0FF", "syntaxKeyword": "#CBA8EC", "syntaxNumber": "#D09A06", "syntaxOperator": "#7C738F", "syntaxString": "#8ADCD0", "syntaxType": "#D09A90", "text": "#E8E3DB", "textMuted": "#9DA7D2", "warning": "#E28950"}, "id": "star-wars", "name": "星球大战", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T10:30:00+08:00"};
    const ip_transformers = {"appearance": "dark", "basePreset": "transformers", "colors": {"background": "#08122B", "backgroundElement": "#0D2354", "backgroundPanel": "#04133A", "border": "#4D5A60", "borderActive": "#F4C803", "bubbleBg": "#241340", "codeBlockBg": "#020B1C", "codeHeaderBg": "#0A2250", "diffAdded": "#8F8C7D", "diffAddedBg": "#182135", "diffAddedLineNumberBg": "#232A3B", "diffRemoved": "#BC9D80", "diffRemovedBg": "#1E2335", "diffRemovedLineNumberBg": "#30313E", "error": "#FF5B02", "info": "#0A6999", "inputBg": "#022447", "markdownBlockQuote": "#907E68", "markdownCode": "#AD7FB0", "markdownEmph": "#FB9A7A", "markdownHeading": "#FBF377", "markdownLink": "#0B8FBF", "markdownStrong": "#FFFFFF", "primary": "#D70A2B", "secondary": "#3366A8", "sidebarBg": "#021128", "success": "#A7ABAA", "syntaxComment": "#767C72", "syntaxFunction": "#E1AA00", "syntaxKeyword": "#FF0044", "syntaxNumber": "#D9B9A0", "syntaxOperator": "#727A85", "syntaxString": "#8E979C", "syntaxType": "#F68C8E", "text": "#CFE2E8", "textMuted": "#BDC1C2", "warning": "#B07400"}, "id": "transformers", "name": "变形金刚", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:37:23+08:00"};
    const ip_ultraman = {"appearance": "dark", "basePreset": "ultraman", "colors": {"background": "#000600", "backgroundElement": "#161945", "backgroundPanel": "#14163C", "border": "#2F3D6A", "borderActive": "#87C3F5", "bubbleBg": "#111433", "codeBlockBg": "#060B11", "codeHeaderBg": "#191C4E", "diffAdded": "#3C9B6F", "diffAddedBg": "#08190E", "diffAddedLineNumberBg": "#0C2416", "diffRemoved": "#C9667B", "diffRemovedBg": "#1A1210", "diffRemovedLineNumberBg": "#281919", "error": "#F05F4E", "info": "#2AA1B7", "inputBg": "#0E112A", "markdownBlockQuote": "#91B2B7", "markdownCode": "#D0B26C", "markdownEmph": "#B6A8CB", "markdownHeading": "#C0ECFF", "markdownLink": "#51AEB5", "markdownStrong": "#F8FBE6", "primary": "#D52518", "secondary": "#EFCB5D", "sidebarBg": "#0A0F1F", "success": "#2F9877", "syntaxComment": "#747D86", "syntaxFunction": "#3A80FA", "syntaxKeyword": "#D95638", "syntaxNumber": "#F4C738", "syntaxOperator": "#8774A2", "syntaxString": "#67CDA6", "syntaxType": "#8CCDE9", "text": "#DEEFF6", "textMuted": "#AFB9BB", "warning": "#BD8E36"}, "id": "ultraman", "name": "奥特曼", "schema": "dsh-opencode-palette.custom-theme.v1", "updatedAt": "2026-10-20T12:51:03+08:00"};
    const ip_zelda = {"appearance":"light","basePreset":"zelda","colors":{"background":"#FAF8EF","backgroundElement":"#DCF7AA","backgroundPanel":"#EEEEE0","border":"#B7C9AF","borderActive":"#267593","bubbleBg":"#FDFCF3","codeBlockBg":"#F7F4EB","codeHeaderBg":"#D4ECAB","diffAdded":"#3B610C","diffAddedBg":"#DFE9CF","diffAddedLineNumberBg":"#D3E2C0","diffRemoved":"#7B4129","diffRemovedBg":"#F0E1D9","diffRemovedLineNumberBg":"#EBDACB","error":"#9E5D4B","info":"#617488","inputBg":"#FEFEF5","markdownBlockQuote":"#47614E","markdownCode":"#26645D","markdownEmph":"#5E5C16","markdownHeading":"#28444A","markdownLink":"#225B73","markdownStrong":"#142D14","primary":"#204A5D","secondary":"#827717","sidebarBg":"#F5F2E9","success":"#466E12","syntaxComment":"#5D6E60","syntaxFunction":"#484915","syntaxKeyword":"#163817","syntaxNumber":"#56271A","syntaxOperator":"#556966","syntaxString":"#235D56","syntaxType":"#455A68","text":"#1E371D","textMuted":"#2E4832","warning":"#77370C"},"id":"zelda","name":"塞尔达传说","schema":"dsh-opencode-palette.custom-theme.v1","updatedAt":"2026-10-20T10:30:00+08:00"};

    const IP_PRESETS = {
      "cyberpunk-2077": ip_cyberpunk_2077,
      "dc-comics": ip_dc_comics,
      "disney": ip_disney,
      "doraemon": ip_doraemon,
      "dragon-ball": ip_dragon_ball,
      "evangelion": ip_evangelion,
      "evangelion-day": ip_evangelion_day,
      "genshin": ip_genshin,
      "genshin-night": ip_genshin_night,
      "harry-potter": ip_harry_potter,
      "hello-kitty": ip_hello_kitty,
      "kuromi": ip_kuromi,
      "lego": ip_lego,
      "mario": ip_mario,
      "mario-night": ip_mario_night,
      "marvel": ip_marvel,
      "naruto": ip_naruto,
      "naruto-night": ip_naruto_night,
      "one-piece": ip_one_piece,
      "pokemon": ip_pokemon,
      "sailor-moon": ip_sailor_moon,
      "star-wars": ip_star_wars,
      "transformers": ip_transformers,
      "ultraman": ip_ultraman,
      "zelda": ip_zelda,
    };

    // —— 主题名：中文优先，缺则英文官方名，再缺则 id ——
    const THEME_ZH = {
    opencode: "opencode", tokyonight: "东京之夜", dracula: "德古拉", gruvbox: "Gruvbox",
    matrix: "黑客帝国", rosepine: "玫瑰松林", catppuccin: "卡布奇诺", "catppuccin-frappe": "卡布奇诺·冰沙",
    "catppuccin-macchiato": "卡布奇诺·玛奇朵", solarized: "Solarized", synthwave84: "合成波 84",
    everforest: "常青森林", nord: "北极", kanagawa: "神奈川", nightowl: "夜猫子",
    "one-dark": "One Dark", monokai: "Monokai", palenight: "苍白之夜", material: "材料设计",
    ayu: "Ayu", carbonfox: "碳狐", cobalt2: "钴蓝", cursor: "Cursor", aura: "光环",
    flexoki: "Flexoki", github: "GitHub", zenburn: "禅燃", mercury: "水星",
    "osaka-jade": "大阪翡翠", vesper: "黄昏星", vercel: "Vercel", "lucent-orng": "透光橙",
    orng: "纯橙", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
    shadesofpurple: "紫影", system: "跟随系统",
    };
    const THEME_EN = {
    opencode: "opencode", tokyonight: "Tokyo Night", dracula: "Dracula", gruvbox: "Gruvbox",
    matrix: "Matrix", rosepine: "Rosé Pine", catppuccin: "Catppuccin", "catppuccin-frappe": "Catppuccin Frappe",
    "catppuccin-macchiato": "Catppuccin Macchiato", solarized: "Solarized", synthwave84: "SynthWave '84",
    everforest: "Everforest", nord: "Nord", kanagawa: "Kanagawa", nightowl: "Night Owl",
    "one-dark": "One Dark", monokai: "Monokai", palenight: "Palenight", material: "Material",
    ayu: "Ayu", carbonfox: "CarbonFox", cobalt2: "Cobalt2", cursor: "Cursor", aura: "Aura",
    flexoki: "Flexoki", github: "GitHub", zenburn: "Zenburn", mercury: "Mercury",
    "osaka-jade": "Osaka Jade", vesper: "Vesper", vercel: "Vercel", "lucent-orng": "Lucent Orange",
    orng: "Orange", amoled: "AMOLED", "oc-2": "OC 2", onedarkpro: "One Dark Pro",
    shadesofpurple: "Shades of Purple", system: "System",
    };
