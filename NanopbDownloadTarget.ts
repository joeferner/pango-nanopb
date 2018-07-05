import {Target} from "pango";
import {ProjectOptions, Targets} from "pango/index";
import {getNanopbOptions, NanopbOptions} from "./NanopbOptions";
import * as request from "request-promise-native";
import * as os from "os";
import * as fs from "fs-extra";
import * as path from "path";

export class NanopbDownloadTarget implements Target {
    async run(projectOptions: ProjectOptions): Promise<void | Targets | string[]> {
        const options = getNanopbOptions(projectOptions);
        if (options.nanopbPath) {
            return;
        }
        await fs.mkdirs(options.appPath);
        options.downloadFileName = path.join(options.appPath, `nanopb-${NanopbDownloadTarget.getOsString()}${NanopbDownloadTarget.getOsExtension()}`);
        if (await fs.pathExists(options.downloadFileName)) {
            return;
        }

        options.downloadUrl = await this.findDownloadUrl(projectOptions, options);
        await this.downloadFile(projectOptions, options);
    }

    private async downloadFile(projectOptions: ProjectOptions, options: NanopbOptions) {
        projectOptions.logger.info(`Downloading "${options.downloadUrl}" to "${options.downloadFileName}"`);
        await request(options.downloadUrl)
            .pipe(fs.createWriteStream(options.downloadFileName));
    }

    private async findDownloadUrl(projectOptions: ProjectOptions, options: NanopbOptions) {
        if (options.downloadUrl) {
            return options.downloadUrl;
        }
        const url = options.downloadUrlPrefix;
        projectOptions.logger.info(`Finding most recent version from ${url}`);
        const page = await request(url);
        const links = this.parseLinks(page);
        if (links.length === 0) {
            throw new Error('Could not find download link');
        }
        return options.downloadUrlPrefix + links[0];
    }

    private parseLinks(page) {
        const osString = NanopbDownloadTarget.getOsString();

        const re = /<a href="(nanopb.*)"/g;
        let m;
        const links: string[] = [];
        while (m = re.exec(page)) {
            links.push(m[1]);
        }
        return links
            .filter(link => {
                return link.indexOf(osString) >= 0;
            });
    }

    private static getOsString() {
        switch (os.platform()) {
            case 'darwin':
                return 'macosx';
            case 'win32':
                return 'windows';
            default:
                return 'linux';
        }
    }

    private static getOsExtension() {
        switch (os.platform()) {
            case 'win32':
                return '.zip';
            default:
                return '.tar.gz';
        }
    }
}
