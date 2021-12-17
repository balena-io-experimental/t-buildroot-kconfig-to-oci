import * as _ from 'lodash';
import * as fs from "fs";

import { createOutputDir, readInput, writeOutputs } from './transformer';

console.log('t-buildroot-kconfig-to-oci-source Started');

// const generateCustomConf = () => {}

const generateDockerfile = async (buildrootVersion="2021.02.4") => {
	let dockerfile = `
	FROM balenalib/amd64-debian:buster-run  AS buildroot-base

	RUN install_packages \
			bc \
			build-essential \
			ca-certificates \
			cmake \
			cpio \
			file \
			locales \
			python3 \
			rsync \
			unzip \
			wget

	RUN sed -i 's/# \(en_US.UTF-8\)/\1/' /etc/locale.gen && \
		/usr/sbin/locale-gen && \
		useradd -ms /bin/bash br-user && \
		chown -R br-user:br-user /home/br-user

	USER br-user

	WORKDIR /home/br-user

	ENV LC_ALL=en_US.UTF-8

	ARG BR_VERSION=${buildrootVersion}

	SHELL ["/bin/bash", "-o", "pipefail", "-c"]

	RUN wget -q -O- https://buildroot.org/downloads/buildroot-$BR_VERSION.tar.gz | tar xz --strip 1

	
	FROM buildroot-base as rootfs

	ARG ROOTFS_LIBC=glibc

	COPY custom_conf.cfg ./

	RUN support/kconfig/merge_config.sh -m \
		custom_conf.cfg

	RUN make olddefconfig && make source && make

	USER root

	WORKDIR /rootfs

	RUN tar xpf /home/br-user/output/images/rootfs.tar -C /rootfs

	# Final image
	FROM scratch

	COPY --from=rootfs rootfs/ /

	SHELL ["/bin/sh", "-o", "pipefail", "-c"]
	`

	return dockerfile;
}

const run = async () => {
	const input = await readInput();
	console.log('input:', input.contract);
	console.log('input directory:', input.artifactPath);
	const outputDir = await createOutputDir();
	console.log('output directory:', outputDir);

	// create Dockerfile in outputDir
	let dockerfile = await generateDockerfile();
	console.log(dockerfile)
	await fs.promises.writeFile(`${outputDir}/Dockerfile`, dockerfile);


	const outContract = {
		type: 'type-product-os-t-service-source@1.1.1',
		data: {
			fragment: {
				type: 'image@1.0.0'
			},
		},
	};

	await writeOutputs([
		{ contract: outContract, artifactType: 'artifact', path: outputDir },
	]);
};

run().catch((err) => {
	console.log('ERROR IN TRANSFORMER', err);
	process.exit(1);
});
