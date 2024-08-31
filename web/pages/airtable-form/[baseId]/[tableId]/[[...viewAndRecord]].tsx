import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';
import { Button, Form, Input, Space } from 'antd';
import { store } from '../../../../src/widgets/synced-store/SyncedStore';
import { useSyncedStore } from '@syncedstore/react';

const AirtableForm = () => {
  const router = useRouter();

  const { baseId, tableId, viewAndRecord } = router.query;
  const viewId = Array.isArray(viewAndRecord) && viewAndRecord.length === 2 ? viewAndRecord[0] : undefined;
  const recordId = Array.isArray(viewAndRecord) ? viewAndRecord[viewAndRecord.length - 1] : undefined;

  // const [formData, setFormData] = useState<any>(null);
  const [form] = Form.useForm();
  const formState = useSyncedStore(store);

  useEffect(() => {
    try {
      if (!baseId || !tableId || !recordId) return;

      const ydoc = new Y.Doc();
      const wsProvider = new WebsocketProvider(
        'ws://localhost:8000', // WebSocket server URL
        `airtable-room-${baseId}-${tableId}-${recordId}`, // Room name based on URL params
        ydoc
      );

      wsProvider.on('sync', (isSynced: any) => {
        console.log('Synchronization status:', isSynced);
      });

      wsProvider.on('status', (event) => {
        console.log('WebSocket status:', event.status);
      });
      
      wsProvider.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
      
      wsProvider.on('open', () => {
        console.log('WebSocket connection opened.');
      });
      
      wsProvider.on('close', () => {
        console.log('WebSocket connection closed.');
      });

      ydoc.on('update', (update) => {
        console.log('Received an update:', update);
      
        // You can apply the update to another Yjs document, send it to another peer, etc.
        // Y.applyUpdate(anotherYdoc, update);
      
        // For more detailed processing, decode the update using Yjs utilities:
        const decodedUpdate = Y.decodeUpdate(update);
        console.log('Decoded update:', decodedUpdate);
      });

      const sharedMap = ydoc.getMap('sharedMap');

      sharedMap.observe((event) => {
        event.changes.keys.forEach((change, key) => {
          console.log(`Key "${key}" changed to "${sharedMap.get(key)}"`);
          form.setFieldsValue({ [key]: sharedMap.get(key) }); // Update form fields
        });
      });
      wsProvider.on('message', (event: any) => {
        try {
          console.log('Raw WebSocket message:', event.data); // Log raw message
          // const data = JSON.parse(event.data);
          // console.log('Parsed WebSocket data:', data); // Log parsed data
          // // setFormData(data.fields);
          // form.setFieldsValue(data.fields);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      // return () => {
      //   wsProvider.destroy();
      // };
    } catch (error) {
      console.error('WebSocket Provider Error:', error);
    }      
  }, [form, formState.formData.data]);

  // const handleFieldChange = (fieldId: string, value: string) => {
  //   setFormData((prevData: any) => ({
  //     ...prevData,
  //     [fieldId]: value,
  //   }));

  //   console.log('data123', baseId, tableId, recordId, fieldId, value);
  //   // Send the updated field back to the server via WebSocket
  //   const ws = new WebSocket('ws://localhost:8000');

  //   // ws.onopen = () => {
  //   //   if (!baseId || !tableId || !recordId) return;
  //   //   let asdf = JSON.stringify({ baseId, tableId, recordId, fieldId, value });
  //   //   console.log(asdf);
  //   //   ws.send(asdf);
  //   // };
  // };
  
  const handleFormChange = (
    changedValues: Record<string, any>,
    allValues: any
  ) => {
    formState.formData['data'] = JSON.stringify(allValues);
    // const stringifiedChangedValues = JSON.stringify(changedValues);
    // console.log('changedValues', changedValues);
    // console.log('allValues', allValues);
    // socket.emit('input-change', stringifiedChangedValues);
  };

  if (!formState.formData) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dynamic Page</h1>
      <p>Base ID: {baseId}</p>
      <p>Table ID: {tableId}</p>
      {viewId && <p>View ID: {viewId}</p>}
      <p>Record ID: {recordId}</p>
      <div className='form'>
        <Form
          form={form}
          name='validateOnly'
          layout='vertical'
          autoComplete='off'
          onValuesChange={handleFormChange}
        >
          <h5>{formState.formData.data}</h5>
          <Form.Item name='id' label='ID'>
            <Input />
          </Form.Item>
          <Form.Item name='name' label='Name' rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name='settings' label='Settings'>
            <Input.TextArea rows={5} />
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default AirtableForm;
