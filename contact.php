<?php
// contact.php — processes contact form via SMTP using PHPMailer
// 1) Run: composer require phpmailer/phpmailer
// 2) Set SMTP credentials in .env or directly below.

require __DIR__ . '/vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function respond($ok, $msg){ header('Content-Type: application/json'); echo json_encode(['ok'=>$ok,'message'=>$msg]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { respond(false, 'Invalid request.'); }

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$company = trim($_POST['company'] ?? '');
$country = trim($_POST['country'] ?? '');
$project = trim($_POST['project_type'] ?? '');
$timeline = trim($_POST['timeline'] ?? '');
$message = trim($_POST['message'] ?? '');

if (!$name || !$email || !$country || !$project || !$timeline || !$message) {
  respond(false, 'Please complete all required fields.');
}

$mail = new PHPMailer(true);
try {
  $mail->isSMTP();
  $mail->Host = getenv('SMTP_HOST') ?: 'smtp.yourhost.com';
  $mail->SMTPAuth = true;
  $mail->Username = getenv('SMTP_USER') ?: 'user@example.com';
  $mail->Password = getenv('SMTP_PASS') ?: 'password';
  $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
  $mail->Port = getenv('SMTP_PORT') ?: 587;

  $mail->setFrom(getenv('SMTP_FROM') ?: 'no-reply@enddrave.com', 'Enddrave Website');
  $mail->addAddress('admin@enddrave.com', 'Enddrave Admin');
  $mail->addReplyTo($email, $name);

  $mail->isHTML(true);
  $mail->Subject = 'New Inquiry via Enddrave.com';
  $mail->Body = "<h3>New Inquiry</h3>
    <p><strong>Name:</strong> {$name}<br>
    <strong>Email:</strong> {$email}<br>
    <strong>Company:</strong> {$company}<br>
    <strong>Country/Timezone:</strong> {$country}<br>
    <strong>Project Type:</strong> {$project}<br>
    <strong>Timeline:</strong> {$timeline}</p>
    <p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>";

  $mail->AltBody = "New Inquiry\nName: {$name}\nEmail: {$email}\nCompany: {$company}\nCountry: {$country}\nProject: {$project}\nTimeline: {$timeline}\nMessage: {$message}";

  $mail->send();
  respond(true, 'Thanks! Your inquiry has been sent.');
} catch (Exception $e) {
  respond(false, 'Mail error: ' . $mail->ErrorInfo);
}
