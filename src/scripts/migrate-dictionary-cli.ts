#!/usr/bin/env node
import { runDictionaryMigration } from '../lib/dictionary/run-migration';
import { createInterface } from 'readline';

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    readline.question(query, resolve);
  });
}

async function main() {
  console.log('\n🔄 TailSpin Dictionary Migration Tool');
  console.log('=====================================\n');
  
  console.log('This tool will migrate the dictionary data to the new optimized structure.');
  console.log('Important notes:');
  console.log('- The migration may take several minutes depending on dictionary size');
  console.log('- Existing dictionary data will be preserved until migration is complete');
  console.log('- The process cannot be safely interrupted once started\n');

  const confirm = await question('Are you sure you want to proceed? (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes') {
    console.log('\n❌ Migration cancelled.');
    process.exit(0);
  }

  console.log('\n🚀 Starting migration...\n');

  try {
    await runDictionaryMigration();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy updated Firestore indexes');
    console.log('2. Verify dictionary access in development environment');
    console.log('3. Monitor performance metrics for improvements');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check Firebase permissions and quotas');
    console.log('2. Verify network connectivity');
    console.log('3. Check error logs for specific issues');
    process.exit(1);
  } finally {
    readline.close();
  }
}

// Run the migration
main().catch(console.error); 