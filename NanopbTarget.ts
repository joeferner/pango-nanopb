import {ProjectOptions, Shell, Target, Targets} from "pango";
import {getNanopbOptions, NanopbOptions} from "./NanopbOptions";
import * as path from "path";
import * as fs from "fs-extra";
import {FileUtils} from "../pango";

export interface NanopbTargetCreateOptions {
    outputDir?: string;
    protoFile: string;
}

export class NanopbTarget implements Target {
    private createOptions: NanopbTargetCreateOptions;

    preRequisites = ['nanopb-extract'];

    constructor(createOptions: NanopbTargetCreateOptions) {
        this.createOptions = createOptions;
    }

    async run(projectOptions: ProjectOptions): Promise<void | Targets | string[]> {
        const options = getNanopbOptions(projectOptions);
        this.createOptions.outputDir = this.createOptions.outputDir || path.join(projectOptions.buildDir, 'nanopb');
        options.pbFileName = path.join(this.createOptions.outputDir, path.basename(this.createOptions.protoFile) + '.pb');
        await fs.mkdirs(this.createOptions.outputDir);

        console.log('options.pbFileName3', options.pbFileName);
        console.log('this.createOptions.protoFile', this.createOptions.protoFile);
        if (await FileUtils.isOutputFileOlderThenInputFiles(options.pbFileName, [this.createOptions.protoFile])) {
            await this.runProtoc(options, projectOptions);
            await this.runProtogen(options, projectOptions);
        }
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
            `--output-dir=${this.createOptions.outputDir}`,
            options.pbFileName
        ];
        const cmdOptions = {
            cwd: path.join(options.nanopbPath, 'generator')
        };
        projectOptions.logger.info(cmd.join(' '));
        await Shell.shell(projectOptions, cmd, cmdOptions);
    }
}
