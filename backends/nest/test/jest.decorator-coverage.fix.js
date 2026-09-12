const fs = require('fs');
const path = require('path');
const { TsJestTransformer } = require('ts-jest');

const DEBUG_DUMP = false; // flip to false once you're done inspecting

function dumpForInspection(sourcePath, code, replaced = false) {
    if (!DEBUG_DUMP) return;
    if (!/session\.entity\.ts$/.test(sourcePath)) return;
    let fileName = path.basename(sourcePath).replace(/\.ts$/, '') + '.generated';
    fileName += replaced ? '-replaced.js' : '.js';
    const outPath = path.join(
        '/app/logs',
        fileName,
    );
    fs.writeFileSync(outPath, code, 'utf8');
}

function patchDesignParamtypes(code) {
    return code.replace(
        /typeof \(_[a-zA-Z0-9]+ = typeof/g,
        (match) => match.replace(
            /typeof/g,
            '/* istanbul ignore next */typeof'
        ),
    ).replace(
        /typeorm_[0-9]\.(ManyToOne|OneToMany)\).*=/g,
        (match) => match.replace(
            /\((?!\()[^)]*\)\s*=/g,
            (submatch) => {
                return `/* istanbul ignore next */${submatch}`;
            }
        )
    );
}

class DecoratorCoverageFixTransformer extends TsJestTransformer {
    process(
        sourceText,
        sourcePath,
        transformOptions
    ) {
        const result = super.process(
            sourceText,
            sourcePath,
            transformOptions
        );

        dumpForInspection(sourcePath, result.code);
        result.code = patchDesignParamtypes(result.code);
        dumpForInspection(sourcePath, result.code, true);

        return result;
    }

    async processAsync(
        sourceText,
        sourcePath,
        transformOptions
    ) {
        const result = await super.processAsync(
            sourceText,
            sourcePath,
            transformOptions
        );

        dumpForInspection(sourcePath, result.code);
        result.code = patchDesignParamtypes(result.code);
        dumpForInspection(sourcePath, result.code, true);

        return result;
    }
}

module.exports = new DecoratorCoverageFixTransformer();