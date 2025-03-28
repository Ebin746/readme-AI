const excludeList = [
    //temp  :make readme include in partial way
    "README.md",
    // General project files
    "node_modules", ".npm", ".yarn", ".pnp", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "dist", "build", "out", ".next", ".vercel", ".turbo", "coverage", ".expo", ".expo-shared",
    "cypress/screenshots", "cypress/videos",

    // Config & build files
    "vite.config.js", "vite.config.ts", "next.config.js", "next.config.mjs", "webpack.config.js",
    "babel.config.js", ".babelrc", "tsconfig.json", "jsconfig.json", ".eslintrc.js", ".eslintignore",
    ".prettierrc", ".prettierignore", ".editorconfig", ".stylelintrc", ".lintstagedrc",

    // Environment files
    ".env", ".env.local", ".env.development", ".env.production", ".env.test",
    
    // Logs & debug files
    "npm-debug.log", "yarn-error.log", "pnpm-debug.log", "debug.log",
    ".DS_Store", "Thumbs.db",

    // Public assets & static files
    "public", "assets", "static", "favicon.ico", "logo192.png", "logo512.png",

    // Git & CI/CD
    ".git", ".gitignore", ".github", ".gitlab", ".circleci", ".husky",

    // Jest & testing configs
    "jest.config.js", "jest.setup.js",

    // Editor & IDE files
    ".vscode", ".idea", ".project", ".settings", ".classpath", ".factorypath",

    // **Blockchain-related exclusions**
    "cache", "artifacts", ".openzeppelin", "contracts/.openzeppelin",
    "hardhat.config.js", "hardhat.config.ts", "hardhat.config.mjs",
    "foundry.toml", ".forge-cache", "forge.out",
    "truffle-config.js", "truffle-config.ts", "truffle.js",
    "ganache-db", "ganache_data", "build/contracts","artifacts/",
    
    // **Python & Flask/Django exclusions**
    ".venv", "venv", "__pycache__", "migrations", "db.sqlite3",
    ".pytest_cache", ".mypy_cache", ".tox", "Pipfile", "Pipfile.lock",
    "requirements.txt", "requirements-dev.txt", "poetry.lock",
    ".coverage", "coverage.xml", "htmlcov",
    
    // **Django-specific**
    "manage.py", "db.sqlite3", "media", "staticfiles", "static_root",
    
    // **Flask-specific**
    ".flaskenv", "instance", "wsgi.py",

    // **C++ Game Development Exclusions**
    "CMakeLists.txt.user", "CMakeCache.txt", "CMakeFiles",
    "Makefile", "Makefile.in", "Makefile.am", "configure", "config.status",
    "compile_commands.json", "compile_flags.txt",
    ".ccls-cache", "compile_commands.json", "conanbuildinfo.txt",
    "lib/", "bin/", "obj/", "CMakeScripts/",
    ".gdb_history", ".gdbinit", ".lldbinit", "*.ilk", "*.pdb",
    "*.dSYM/", "*.ncb", "*.sdf", "*.vcxproj", "*.vcxproj.filters",
    "*.sln", "*.suo", "*.db", "*.ipch",
    ".vs/", "Debug/", "Release/", "x64/", "x86/", "CMakeUserPresets.json",

    // **Java & Android Exclusions**
    ".gradle", "gradle/", "gradlew", "gradlew.bat", 
    "build/", "bin/", "out/",
    "local.properties", "android.iml", ".idea/", "*.iml",
    "app/build/", "app/release/", "*.apk", "*.aab", "*.dex",
    ".cxx/", "libs/", "obj/", "gen/", "intermediates/", 
    "proguard-rules.pro", "google-services.json",

    // **Flutter Exclusions**
    ".flutter-plugins", ".flutter-plugins-dependencies",
    ".dart_tool", "build/", "pubspec.lock", ".packages",
    ".fvm/", ".dart_tool/", "generated_plugin_registrant.dart",
    "android/.gradle/", "android/app/release/", "ios/Pods/",

    // **React Native Exclusions**
    ".expo", ".expo-shared", ".watchmanconfig", "ios/Pods/",
    "android/.gradle/", "android/app/build/", "ios/build/",
    ".vscode/", ".nvmrc", "metro.config.js", "babel.config.js",
    "index.android.js", "index.ios.js",

    // **General Java exclusions**
    "*.class", "*.jar", "*.war", "*.ear",
    "target/", ".mvn/", "pom.xml", "settings.xml"
];

const excludeExtensions = [
    // Images
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico",

    // Fonts
    ".ttf", ".woff", ".woff2", ".otf", ".eot",

    // Videos & Audio
    ".mp4", ".mp3", ".wav", ".mov", ".avi",

    // Archives
    ".zip", ".rar", ".tar.gz",

    // **Compiled & unnecessary files**
    ".pyc", ".pyo", ".pyd",  // Compiled Python files
    ".class", ".jar", ".war", ".ear",  // Java bytecode & archives
    ".o", ".a", ".so", ".dll", ".dylib", ".exe", ".bin", ".elf", // Compiled C/C++ files
    ".swp", ".swo", ".bak",  // Backup & swap files
    ".log", ".out", ".tmp", ".cache",  // Temporary & log files
    ".sqlite3", ".db", ".db-journal",  // Database files
    ".obj", ".ilk", ".pdb", ".exp", ".lib", // C++ debugging and linking
    ".dex", ".apk", ".aab", // Android binary and package files
    ".ipa" // iOS application package
];
export {excludeExtensions,excludeList}