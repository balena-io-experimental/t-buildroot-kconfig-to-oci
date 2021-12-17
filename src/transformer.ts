import { core } from '@balena/jellyfish-types';
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { Input, OutData, Result } from './types';

const getEnvOrFail = (envVar: string) => {
	const env = process.env[envVar];
	if (!env) {
		console.log(`required env var ${envVar} was not set`);
		process.exit(1);
	}
	return env;
};

// worker exposes this
const outputManifestPath = getEnvOrFail('OUTPUT');
const inputManifestPath = getEnvOrFail('INPUT');

const inputDir = path.dirname(inputManifestPath);
const outDir = path.dirname(outputManifestPath);

let outputs = 0;
export const createOutputDir = async () => {
	outputs++;
	const outputDir = path.join(outDir, `result-artifacts${outputs}`);
	await fs.promises.mkdir(outputDir, { recursive: true });
	return outputDir;
};

export const readInput = async () => {
	const inManifest: Input = YAML.parse(
		(await fs.promises.readFile(inputManifestPath)).toString(),
	);
	// make path absolute to make handling for users easier
	inManifest.input.artifactPath = path.join(
		inputDir,
		inManifest.input.artifactPath,
	);
	return inManifest.input;
};

export const writeOutputs = async (
	results: Array<{
		contract: Omit<core.ContractDefinition<OutData>, 'slug'>;
		artifactType: 'artifact' | 'image' | 'none';
		path: string;
	}>,
) => {
	const result: Result = {
		results: results.map((r) => ({
			contract: r.contract,
			...mapArtifact(r.artifactType, r.path),
		})),
	};
	console.log('result:', result);
	await fs.promises.writeFile(outputManifestPath, JSON.stringify(result));
};

const mapArtifact = (artifactType: string, outputDir: string) => {
	switch (artifactType) {
		case 'artifact':
			return {
				artifactPath: path.relative(outDir, outputDir),
			};
		case 'image':
			return {
				imagePath: path.relative(outDir, path.join(outputDir, 'image.tar')),
			};
		default:
			console.log('no artifact produced for', outputDir);
			return {};
	}
};
