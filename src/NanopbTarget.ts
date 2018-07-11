import {FileUtils, ProjectOptions, Shell, Target, Targets} from "pango";
import {getNanopbOptions, NanopbOptions} from "./NanopbOptions";
import * as path from "path";
import * as fs from "fs-extra";
import * as glob from "glob-promise";

export interface NanopbTargetCreateOptions {
    outputDir?: string;
    protoFile: string;
    optionsFile?: string;
}

export class NanopbTarget implements Target {
    private createOptions: NanopbTargetCreateOptions;

    preRequisites = ['nanopb-extract'];
    postRequisites = ['generate-sources'];

    constructor(createOptions: NanopbTargetCreateOptions) {
        this.createOptions = createOptions;
    }

    async run(projectOptions: ProjectOptions): Promise<void | Targets | string[]> {
        const options = getNanopbOptions(projectOptions);
        this.createOptions.outputDir = this.createOptions.outputDir || path.join(projectOptions.buildDir, 'nanopb');
        options.pbFileName = path.join(this.createOptions.outputDir, path.basename(this.createOptions.protoFile) + '.pb');
        if (this.createOptions.optionsFile) {
            options.optionsFile = this.createOptions.optionsFile;
        }
        await fs.mkdirs(this.createOptions.outputDir);

        if (await FileUtils.isOutputFileOlderThenInputFiles(options.pbFileName, [this.createOptions.protoFile])) {
            await this.runProtoc(options, projectOptions);
            await this.runProtogen(options, projectOptions);
        }
        await NanopbTarget.copyCommonFiles(options, this.createOptions.outputDir);

        projectOptions.includeDirs = projectOptions.includeDirs || [];
        projectOptions.includeDirs.push(this.createOptions.outputDir);

        const cFiles = (await glob('*+(.c)', {cwd: this.createOptions.outputDir, dot: true, follow: true}))
            .map((file) => {
                const fileName = path.join(this.createOptions.outputDir, file);
                return {
                    fileName,
                    outputPath: fileName + '.o',
                    depPath: fileName + '.d'
                };
            });
        projectOptions.sourceFiles.push(...cFiles);
    }

    private async runProtoc(options: NanopbOptions, projectOptions: ProjectOptions) {
        const cmd = [
            'protoc',
            `--proto_path=${path.dirname(this.createOptions.protoFile)}`,
            `-o${options.pbFileName}`,
            path.basename(this.createOptions.protoFile)
        ];
        const cmdOptions = {
            cwd: path.join(options.nanopbPath, 'generator-bin')
        };
        projectOptions.logger.info(cmd.join(' '));
        await Shell.shell(projectOptions, cmd, cmdOptions);
    }

    private async runProtogen(options: NanopbOptions, projectOptions: ProjectOptions) {
        const cmd = [
            'python',
            path.join(options.nanopbPath, 'generator', 'nanopb_generator.py'),
            `--output-dir=${this.createOptions.outputDir}`
        ];
        if (options.optionsFile) {
            cmd.push(`--options-file=${options.optionsFile}`);
        }
        cmd.push(options.pbFileName);
        const cmdOptions = {
            cwd: path.join(options.nanopbPath, 'generator')
        };
        projectOptions.logger.info(cmd.join(' '));
        await Shell.shell(projectOptions, cmd, cmdOptions);
    }

    private static async copyCommonFiles(options: NanopbOptions, outputDir: string) {
        const fileNames = [
            'pb.h',
            'pb_common.c',
            'pb_common.h',
            'pb_decode.c',
            'pb_decode.h',
            'pb_encode.c',
            'pb_encode.h'
        ];
        for (let fileName of fileNames) {
            const sourceFile = path.join(options.nanopbPath, fileName);
            const destFile = path.join(outputDir, fileName);
            if (await FileUtils.isOutputFileOlderThenInputFiles(destFile, [sourceFile])) {
                await fs.copy(sourceFile, destFile);
            }
        }
    }
}
