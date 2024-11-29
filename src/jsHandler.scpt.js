const app = Application.currentApplication();
app.includeStandardAdditions = true;

function getSublimeTextPath() {
    const possiblePaths = [
        '/Applications/Sublime Text.app',
        '/Applications/Sublime Text Dev.app'
    ];

    for (const path of possiblePaths) {
        if ($.NSFileManager.defaultManager.fileExistsAtPath(path)) {
            return `${path}/Contents/SharedSupport/bin/subl`;
        }
    }

    throw new Error("Sublime Text not found. Please ensure it's installed in /Applications");
}

function run(argv) {
    try {
        const sublimeTextBinary = getSublimeTextPath();

        // Parse the URL components
        if (!argv[0] || !argv[0]["URL"]) {
            throw new Error("No URL provided");
        }

        const url = argv[0]["URL"];
        const [base, query] = url.split('?', 2);

        if (!query) {
            throw new Error("Invalid URL format: missing query parameters");
        }

        // Parse query parameters
        const paramPairs = query.split('&').map(arg => arg.split('=', 2));
        const params = paramPairs.reduce((acc, [key, value]) => {
            if (value) {
                acc[key] = decodeURIComponent(value);
            }
            return acc;
        }, {});

        if (!params.url) {
            throw new Error("Missing file URL parameter");
        }

        const file = params.url.replace(/^file:\/\//, "");

        // Test file existence
        let isDirectory = Ref();
        const fileExists = $.NSFileManager.defaultManager.fileExistsAtPathIsDirectory(file, isDirectory);

        if (!fileExists) {
            throw new Error(`File not found: ${file}`);
        }

        if (isDirectory[0] === 1) {
            throw new Error(`Path is a directory: ${file}`);
        }

        // Launch Sublime Text
        const task = $.NSTask.alloc.init;
        task.launchPath = sublimeTextBinary;

        // Build arguments with line and column if provided
        let locationSpec = file;
        if (params.line) {
            locationSpec += `:${params.line}`;
            if (params.column) {
                locationSpec += `:${params.column}`;
            }
        }

        task.arguments = [locationSpec];

        try {
            task.launch;
        } catch (error) {
            throw new Error(`Failed to launch Sublime Text: ${error.message}`);
        }

    } catch (error) {
        app.displayAlert("Sublime URL Handler Error", {
            message: error.message,
            buttons: ["OK"],
            defaultButton: "OK"
        });
    }
}
