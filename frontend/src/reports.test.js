import 'fake-indexeddb/auto';
import { loadReports, saveReport } from './reports';
global.fetch = jest.fn();
test('default mode persists reports without HTTP', async () => {
  const data = new FormData();
  for(const [key,value] of Object.entries({name:'Test',category:'blocked_sidewalk',description:'Obstacle',latitude:'44.438',longitude:'26.09'})) data.set(key,value);
  await saveReport(data);
  const reports = await loadReports();
  expect(reports).toHaveLength(1);
  expect(reports[0]).toMatchObject({name:'Test',latitude:44.438,longitude:26.09});
  expect(fetch).not.toHaveBeenCalled();
});
test('rejects invalid coordinates',async () => {
  const data = new FormData();data.set('latitude','200');data.set('longitude','26');
  await expect(saveReport(data)).rejects.toThrow(/valid report location/);
});
