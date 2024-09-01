import { useSyncedStore } from '@syncedstore/react';
import { Form, Input } from 'antd';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

import { store, initializeProvider, disconnectProvider } from '../../../../src/widgets/synced-store/SyncedStore';

const AirtableForm = () => {
  const router = useRouter();
  const { baseId, tableId, viewAndRecord } = router.query;
  const viewId = Array.isArray(viewAndRecord) && viewAndRecord.length === 2 ? viewAndRecord[0] : undefined;
  const recordId = Array.isArray(viewAndRecord) ? viewAndRecord[viewAndRecord.length - 1] : undefined;

  const [form] = Form.useForm();
  const formState = useSyncedStore(store);

  useEffect(() => {
    if (baseId && tableId && recordId) {
      initializeProvider(baseId as string, tableId as string, recordId as string);
    }

    return () => {
      disconnectProvider();
    };
  }, [baseId, tableId, recordId]);

  // Observe formState and update the form whenever it changes
  useEffect(() => {
    if (formState.formData && Object.keys(formState.formData).length > 0) {
      form.setFieldsValue({
        Focus: formState.formData['Focus'],
        'Submitted On': formState.formData['Submitted On'],
        Name: formState.formData['Name'],
        DynamicField: formState.formData['Dynamic Field'],
        Calculation: formState.formData['Calculation'],
      });
    }
  }, [formState.formData, form]);
 
  const handleFormChange = (
    changedValues: Record<string, any>,
    allValues: any
  ) => {
    // Respect original case-sensitive keys
    Object.keys(changedValues).forEach((key) => {
      const originalKey = key; // Use the original key from Airtable data
      store.formData[originalKey] = changedValues[key];
    });
  };

  if (!formState.formData || Object.keys(formState.formData).length === 0) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Dynamic Page</h1>
      <p>Base ID: {baseId}</p>
      <p>Table ID: {tableId}</p>
      {viewId && <p>View ID: {viewId}</p>}
      <p>Record ID: {recordId}</p>
      <p>Form data: {JSON.stringify(formState)}</p>
      <div className='form'>
        <Form
          form={form}
          name='validateOnly'
          layout='vertical'
          autoComplete='off'
          onValuesChange={handleFormChange}
        >
          <Form.Item name='Focus' label='Focus'>
            <Input />
          </Form.Item>
          <Form.Item name='Submitted On' label='Submitted On'>
            <Input />
          </Form.Item>
          <Form.Item name='Name' label='Name' rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name='DynamicField' label='Dynamic Field'>
            <Input />
          </Form.Item>
          <Form.Item name='Calculation' label='Calculation'>
            <Input />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default AirtableForm;
