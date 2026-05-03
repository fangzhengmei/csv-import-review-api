const express = require('express');
const ImportController = require('../controllers/importController');

const router = express.Router();

router.get('/statuses', ImportController.getStatuses);
router.post('/upload', ImportController.upload, ImportController.uploadCsv);
router.get('/', ImportController.getImportList);
router.get('/:importId', ImportController.getImportDetail);
router.get('/:importId/preview', ImportController.getPreviewRows);
router.get('/:importId/errors', ImportController.getErrorRows);
router.post('/:importId/submit', ImportController.submitForReview);
router.post('/:importId/approve', ImportController.approveImport);
router.post('/:importId/reject', ImportController.rejectImport);
router.post('/:importId/confirm', ImportController.confirmImport);
router.delete('/:importId', ImportController.cancelImport);

module.exports = router;
