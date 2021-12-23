import * as _ from 'lodash';
import * as fs from "fs";

import { createOutputDir, readInput, writeOutputs } from './transformer';

console.log('t-buildroot-kconfig-to-oci-source Started');


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
RUN useradd -ms /bin/bash br-user && \
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

const generateCustomConf = async (configs:Array<string>,arch:string) => {
	let defaultConf = `
BR2_TOOLCHAIN_BUILDROOT_CXX=y
BR2_TOOLCHAIN_BUILDROOT_GLIBC=y
BR2_KERNEL_HEADERS_4_19=y
BR2_GCC_ENABLE_LTO=y

# We don't need init inside a container
BR2_INIT_NONE=y


BR2_PACKAGE_BUSYBOX=y

# We don't need a system shell or ifupdown-scripts
BR2_SYSTEM_BIN_SH_NONE=n
BR2_PACKAGE_IFUPDOWN_SCRIPTS=n

BR2_${arch}=y

`;
let result =defaultConf;
configs.forEach(config => {
	result =`
	${result}
	${config}
	`;
});
return result;

}

const run = async () => {
	const input = await readInput();
	console.log('input:', input.contract);
	console.log('input directory:', input.artifactPath);
	const outputDir = await createOutputDir();
	console.log('output directory:', outputDir);

	// create Dockerfile in outputDir
	let dockerfile = await generateDockerfile();
	console.log("Dockerfile",dockerfile.trim())
	await fs.promises.writeFile(`${outputDir}/Dockerfile`, dockerfile);

	let arch:string = input.contract.data.arch || 'x86_64';

	let cfg = await generateCustomConf(input.contract.data.configs,arch);
	console.log("custom_conf.cfg",cfg.trim())
	await fs.promises.writeFile(`${outputDir}/custom_conf.cfg`, cfg.trim());


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
