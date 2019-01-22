const config = require('./config');

module.exports = {
    deployContract,
};

async function deployContract(
    owner,
    path,
    initState = `(${'0x575f81ffb0a297b7725dc671da0b1769b1fc5cbe45385c7b5ad1fc2eaf1d609d'}, ${10000000000000000}, ${10000000000000000})`
) {
    const source = utils.readFileRelative(path, 'utf-8');

    const compiled = await owner.contractCompile(source, {
        gas: config.gas,
    });

    const instance = await compiled.deploy({
        initState,
        options: {
            ttl: config.ttl,
        },
        abi: 'sophia',
    });
    return { compiled, instance };
}
