import {ProjectOptions} from "pango";
import * as path from "path";

export interface NanopbOptions {
    appPath?: string;
    downloadUrlPrefix?: string;
    downloadFileName?: string;
    downloadUrl?: string;
    nanopbPath?: string;
    pbFileName?: string;
    optionsFile?: string;
}

export function getNanopbOptions(projectOptions: ProjectOptions): NanopbOptions {
    return projectOptions.nanopb = {
        downloadUrlPrefix: 'https://jpa.kapsi.fi/nanopb/download/',
        appPath: path.join(projectOptions.appPath, 'nanopb'),
        ...(projectOptions.nanopb || {})
    };
}
