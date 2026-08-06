<?php

declare(strict_types=1);

$packageRoot = dirname(__DIR__);
$directories = ['src', 'templates', 'tests'];
$failures = [];
$templateContextMarkers = [
    '@var \\Mise\\Php\\Props $props',
    '@var array<string, \\Mise\\Php\\Slot> $slots',
    '@var \\Mise\\Php\\Escaper $escape',
    '@var \\Mise\\Php\\UrlPolicy $url',
    '$renderComponent',
    '$renderSlot',
];

foreach ($directories as $directory) {
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($packageRoot . '/' . $directory),
    );
    foreach ($iterator as $file) {
        if (!$file->isFile() || $file->getExtension() !== 'php') {
            continue;
        }
        $command = escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($file->getPathname());
        exec($command, $output, $exitCode);
        if ($exitCode !== 0) {
            $failures[] = $file->getPathname();
        }

        if ($directory === 'templates') {
            $source = file_get_contents($file->getPathname());
            foreach ($templateContextMarkers as $marker) {
                if (!is_string($source) || !str_contains($source, $marker)) {
                    $failures[] = $file->getPathname() . ' missing template context ' . $marker;
                }
            }
        }
        $output = [];
    }
}

if ($failures !== []) {
    fwrite(STDERR, 'PHP LINT FAIL: ' . implode(', ', $failures) . PHP_EOL);
    exit(1);
}

echo "MISE PHP LINT PASS\n";
