import { core } from '@balena/jellyfish-types';

type InData = {
	// everything in here should be part of the input filter or the input type's schema
	someProperty: string;
};

export interface OutData {
	someResultProperty: number;
}

interface TransformerData {
	targetPlatform?: string;
}

// a general form of this would make sense in a "Transformers SDK"
export type Input = {
	input: {
		contract: core.Contract<InData>;
		transformerContract: core.Contract<TransformerData>;
		artifactPath: string; // relative to the input file
		decryptedSecrets?: {
			buildSecrets?: {
				[key: string]: string;
			};
		};
		decryptedTransformerSecrets?: {
			buildSecrets?: {
				[key: string]: string;
			};
		};
	};
};

export type Result = {
	results: Array<{
		contract: Omit<core.ContractDefinition<OutData>, 'slug'>;
		artifactPath?: string; // relative to the results file
		imagePath?: string; // relative to the results file
	}>;
};
