import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLegacyProject } from '../project-mapping.ts';
test('legacy matching only links one unambiguous project', () => {
  const projects = [{ id: 'a', name: 'CRM', clientName: 'Acme' }, { id: 'b', name: 'CRM', clientName: 'Beta' }];
  assert.equal(resolveLegacyProject({ projectName: ' crm ', clientName: 'acme' }, projects), 'a');
  assert.equal(resolveLegacyProject({ projectName: 'CRM' }, projects), '');
  assert.equal(resolveLegacyProject({ projectName: 'CRM', clientName: 'Other' }, projects), '');
  assert.equal(resolveLegacyProject({ projectName: '' }, projects), '');
  assert.equal(resolveLegacyProject({ projectName: 'CRM', clientName: 'Acme' }, [...projects, { ...projects[0], id: 'c' }]), '');
});
