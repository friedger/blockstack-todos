import { assert } from 'chai';
import { Provider, ProviderRegistry, Client, Receipt } from '@blockstack/clarity';

const addresses = [
  'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
  'S02J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE',
];
const alice = addresses[0];
const bob = addresses[1];

class RegistryClient extends Client {
  constructor(provider: Provider) {
    super(
      'S1G2081040G2081040G2081040G208105NK8PE5.todo-registry',
      'contracts/todo-registry.clar',
      provider
    );
  }

  async register(name: string, url: string, params: { sender: string }): Promise<Receipt> {
    const tx = this.createTransaction({
      method: {
        name: 'register',
        args: [`"${name}"`, `"${url}"`],
      },
    });
    await tx.sign(params.sender);
    const receipt = await this.submitTransaction(tx);
    return receipt;
  }

  async update(name: string, url: string, params: { sender: string }): Promise<Receipt> {
    const tx = this.createTransaction({
      method: {
        name: 'update',
        args: [`"${name}"`, `"${url}"`],
      },
    });
    await tx.sign(params.sender);
    const receipt = await this.submitTransaction(tx);
    return receipt;
  }

  async getLastId(): Promise<string | undefined> {
    const q = this.createQuery({
      method: {
        name: 'get-last-registry-id',
        args: [],
      },
    });
    const receipt = await this.submitQuery(q);
    if (receipt.success) {
      return receipt.result;
    } else {
      return undefined;
    }
  }
}

describe('to-do registry contract test suite', () => {
  let provider: Provider;
  let registryClient: RegistryClient;

  describe('syntax tests', () => {
    before(async () => {
      provider = await ProviderRegistry.createProvider();
      registryClient = new RegistryClient(provider);
    });

    it('should have a valid syntax', async () => {
      await registryClient.checkContract();
      await registryClient.deployContract();
    });

    after(async () => {
      await provider.close();
    });
  });

  describe('basic tests', () => {
    beforeEach(async () => {
      provider = await ProviderRegistry.createProvider();
      registryClient = new RegistryClient(provider);
      await registryClient.deployContract();
    });

    it('should register an entry', async () => {
      const result = await registryClient.register(
        'alice.id.blockstack',
        'https://example.com/alice.id.blockstack/todo',
        {
          sender: alice,
        }
      );
      assert.equal(true, result.success);
    });

    it('should fail on update for non-existing entry', async () => {
      const result = await registryClient.update(
        'alice.id.blockstack',
        'https://example.com/alice.id.blockstack/todo',
        {
          sender: alice,
        }
      );
      assert.equal(false, result.success);
      assert.isTrue((result.error as any).errorOutput.includes('UnwrapFailure'));
    });

    afterEach(async () => {
      await provider.close();
    });
  });

  describe('tests with one existing entry', () => {
    beforeEach(async () => {
      provider = await ProviderRegistry.createProvider();
      registryClient = new RegistryClient(provider);
      await registryClient.deployContract();

      const result = await registryClient.register(
        'alice.id.blockstack',
        'https://example.com/alice.id.blockstack/todo',
        {
          sender: alice,
        }
      );
      assert.equal(true, result.success);
    });

    it('should update an existing entry', async () => {
      const result = await registryClient.update('alice.id.blockstack', 'https://alice.com/todo', {
        sender: alice,
      });
      assert.equal(true, result.success);
    });

    it('should register a second entry', async () => {
      const result = await registryClient.register('bob.id.blockstack', 'https://bob.com/todo', {
        sender: alice,
      });
      assert.equal(true, result.success);
      assert.equal('u2', await registryClient.getLastId());
    });

    it('should reject for an update from 3rd-part', async () => {
      const result = await registryClient.update('alice.id.blockstack', 'https://alice.com/todo', {
        sender: bob,
      });
      assert.equal(false, result.success);
      assert.equal('Aborted: u1', (result.error as any).commandOutput);
    });

    it('should fail on re-registration', async () => {
      const result = await registryClient.register(
        'alice.id.blockstack',
        'https://alice.com/todo',
        {
          sender: alice,
        }
      );
      assert.equal(false, result.success);
      assert.isTrue((result.error as any).errorOutput.includes('UnwrapFailure'));
    });

    afterEach(async () => {
      await provider.close();
    });
  });
});
