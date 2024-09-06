import { useSyncedStore } from '@syncedstore/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import validator from '@rjsf/validator-ajv8'

import Form from '@rjsf/core';
import { Row, Col } from 'antd';

import { store, initializeProvider, disconnectProvider, updateFormData } from '../../../../src/widgets/synced-store/SyncedStore';

const AirtableForm = () => {
  const router = useRouter();
  const { baseId, tableId, viewAndRecord } = router.query;
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
  console.log(formState.formData, formState.configData, isInitialLoad, Object.keys(formState.formData).length === 0);

  if (!formState.formData || isInitialLoad) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <h1>Dynamic Page</h1>
{/*
      <p>Base ID: {baseId}</p>
      <p>Table ID: {tableId}</p>
      {viewId && <p>View ID: {viewId}</p>}
      <p>Record ID: {recordId}</p>
      <p>Form data: {JSON.stringify(formState.formData)}</p>
      <p>Form config: {JSON.stringify(formState.configData)}</p>
*/}
      {formState?.configData?.viewConfig ? <Row justify="start">
        <Col span={20}>
          <Form
            schema={formState.configData.viewConfig}
            validator={validator}
            uiSchema={formState.configData.uiSchema}
            formData={formState.formData}
            children={true}
            theme="antd"
            onChange={({ formData }) => handleFormChange(formData)}
          />
        </Col>
      </Row> : <p>Loading...</p>}
    </div>
  );
};

export default AirtableForm;
