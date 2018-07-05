import {ProjectOptions, Target, Targets} from "pango";
import {getNanopbOptions, NanopbOptions} from "./NanopbOptions";
import * as decompress from "decompress";
import * as path from "path";
import * as fs from "fs-extra";

export class NanopbExtractTarget implements Target {
    preRequisites = ['nanopb-download'];

    async run(projectOptions: ProjectOptions): Promise<void | Targets | string[]> {
        const options = getNanopbOptions(projectOptions);
        options.nanopbPath = path.join(options.appPath, 'nanopb');
        if (await NanopbExtractTarget.isValidNanopbDirection(options)) {
            return;
        }

        projectOptions.logger.info(`Extracting "${options.downloadFileName}" to "${options.nanopbPath}"`);
        await decompress(options.downloadFileName, options.nanopbPath, {
            strip: 1
        });
    }

    private static async isValidNanopbDirection(options: NanopbOptions) {
        const p = path.join(options.nanopbPath, 'generator-bin', 'protoc');
        return await fs.pathExists(p);
    }
}
