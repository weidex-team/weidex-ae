const config = require('./config');

module.exports = {
    deployContract,
};

async function deployContract(owner, path, initState) {
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
