import { useSyncedStore } from '@syncedstore/react';
// import { Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8'

import Form from '@rjsf/core';
import { Row, Col } from 'antd';

import { store, initializeProvider, disconnectProvider, updateFormData } from '../../../../src/widgets/synced-store/SyncedStore';

const uiSchema: UiSchema = {
  name: {
    'ui:classNames': 'custom-class-name',
  },
  age: {
    'ui:classNames': 'custom-class-age',
  },
};

const AirtableForm = () => {
  const router = useRouter();
  const { baseId, tableId, viewAndRecord } = router.query;
  const viewId = Array.isArray(viewAndRecord) && viewAndRecord.length === 2 ? viewAndRecord[0] : undefined;
  const recordId = Array.isArray(viewAndRecord) ? viewAndRecord[viewAndRecord.length - 1] : undefined;

  // const [form] = Form.useForm();
  const formState = useSyncedStore(store);
  const [previousFormData, setPreviousFormData] = useState<Record<string, any> | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (baseId && tableId && recordId) {
     initializeProvider(baseId as string, tableId as string, recordId as string);
    }

    return () => {
      disconnectProvider();
    };
  }, [baseId, tableId, recordId]);

  useEffect(() => {
    if (formState.formData) {
      setPreviousFormData({ ...formState.formData });
      setIsInitialLoad(false);
      // if (isInitialLoad) {
      //   // Use a timeout to ensure formState.formData is fully populated
      //   const timer = setTimeout(() => {
      //     setIsInitialLoad(false);
      //   }, 3000); // Adjust the timeout as needed
  
      //   return () => clearTimeout(timer);
      // }
    }
  }, [JSON.stringify(formState.formData), isInitialLoad]);

  const handleFormChange = (formData: Record<string, any>) => {
    const changedFields: Record<string, any> = {};

    Object.keys(formData).forEach((key) => {
      if (formData[key] !== previousFormData[key]) {
        changedFields[key] = formData[key];
      }
    });

    // Update previous form data
    setPreviousFormData({ ...formData });

    // Update the SyncedStore
    Object.assign(formState.formData, changedFields);

    console.log(changedFields, JSON.stringify(formState.formData), formData);

    // Send updated fields to WebSocket server
    if (!isInitialLoad) {
      Object.keys(changedFields).forEach((key) => {
        updateFormData(key, changedFields[key]);
      });
    }
  };

  if (!formState.formData || Object.keys(formState.formData).length === 0 || isInitialLoad) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Dynamic Page</h1>
      <p>Base ID: {baseId}</p>
      <p>Table ID: {tableId}</p>
      {viewId && <p>View ID: {viewId}</p>}
      <p>Record ID: {recordId}</p>
      <p>Form data: {JSON.stringify(formState.formData)}</p>
      <p>Form config: {JSON.stringify(formState.configData)}</p>
      <Row justify="start">
        <Col span={12}>
          <Form
            schema={formState.configData.viewConfig}
            validator={validator}
            uiSchema={uiSchema}
            formData={formState.formData}
            children={true}
            onChange={({ formData }) => handleFormChange(formData)}
            // uiSchema={uiSchema}
            // FieldTemplate={CustomFieldTemplate}
            // onSubmit={handleSubmit}
          />
        </Col>
      </Row>
      {/* <div className='form'>
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
          <Form.Item name='Dynamic Field' label='Dynamic Field'>
            <Input />
          </Form.Item>
          <Form.Item name='Calculation' label='Calculation'>
            <Input />
          </Form.Item>
        </Form>
      </div> */}
    </div>
  );
};

export default AirtableForm;
