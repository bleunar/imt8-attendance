"""
Email/SMTP utilities for Attendance application.

Provides async email sending capabilities with retry logic.
"""

import asyncio
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

from config import settings


class EmailService:
    """Email service for sending emails via SMTP."""
    
    @staticmethod
    async def send_email(
        to: str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None
    ) -> bool:
        """
        Send an email.
        
        Args:
            to: Recipient email address
            subject: Email subject
            body_html: HTML body content
            body_text: Plain text body (optional, derived from HTML if not provided)
        
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            message["To"] = to
            message["Subject"] = subject
            
            # Add plain text version
            if body_text:
                message.attach(MIMEText(body_text, "plain"))
            
            # Add HTML version
            message.attach(MIMEText(body_html, "html"))
            
            # Configure SMTP based on port
            use_tls = settings.SMTP_PORT == 465
            
            # Send email
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                use_tls=use_tls,
                start_tls=not use_tls, # Use STARTTLS if not implicit TLS
            )
            
            return True
            
        except Exception as e:
            print(f"[Email] Failed to send email to {to}: {str(e)}")
            return False
    
    @staticmethod
    async def send_recovery_email(to: str, otp: str, name: str = "User") -> bool:
        """
        Send a password recovery email with OTP.
        
        Args:
            to: Recipient email address
            otp: One-time password for verification
            name: Recipient's name
        
        Returns:
            True if email sent successfully, False otherwise
        """
        subject = "Password Recovery - ITSD Attendance"
        
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1e293b; color: white; padding: 30px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9fafb; }}
                .otp {{ font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; 
                        padding: 10px 20px; background-color: #EEF2FF; margin: 20px 0; letter-spacing: 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div style="font-size: 36px; font-weight: bold; letter-spacing: -1px; color: white; font-family: sans-serif;">
                        ITSD<span style="color: #2563eb;">Attendance</span>
                    </div>
                </div>
                <div class="content">
                    <p>Hello {name},</p>
                    <p>You have requested to reset your password. Use the following OTP to verify your identity:</p>
                    <div class="otp">{otp}</div>
                    <p>This OTP will expire in 10 minutes.</p>
                    <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
                </div>
                <div class="footer">
                    <p>&copy; ITSD Attendance System</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        body_text = f"""
        Password Recovery - ITSD Attendance
        
        Hello {name},
        
        You have requested to reset your password. Use the following OTP to verify your identity:
        
        {otp}
        
        This OTP will expire in 10 minutes.
        
        If you did not request this password reset, please ignore this email.
        """
        
        return await EmailService.send_email(to, subject, body_html, body_text)


async def check_smtp_connection(
    max_attempts: int = 5,
    timeout_seconds: int = 10
) -> bool:
    """
    Check SMTP connection with retry logic.
    
    Args:
        max_attempts: Maximum number of connection attempts
        timeout_seconds: Timeout for each attempt in seconds
    
    Returns:
        True if connection successful, False otherwise
    """
    for attempt in range(1, max_attempts + 1):
        try:
            print(f"[SMTP] Connection attempt {attempt}/{max_attempts}...")
            
            # Configure based on port
            use_tls = settings.SMTP_PORT == 465
            
            # Create SMTP client and connect
            smtp = aiosmtplib.SMTP(
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                timeout=timeout_seconds,
                use_tls=use_tls,
            )
            
            await asyncio.wait_for(
                smtp.connect(),
                timeout=timeout_seconds
            )
            
            # Start TLS only if not already implicit TLS
            if not use_tls:
                try:
                    await smtp.starttls()
                except aiosmtplib.SMTPException as e:
                    # Ignore if already using TLS, otherwise re-raise
                    if "already using TLS" not in str(e):
                        raise e
            
            # Try to login
            await smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            
            # Close connection
            await smtp.quit()
            
            print(f"[SMTP] Connection successful!")
            return True
            
        except asyncio.TimeoutError:
            print(f"[SMTP] Attempt {attempt} timed out after {timeout_seconds}s")
        except Exception as e:
            print(f"[SMTP] Attempt {attempt} failed: {str(e)}")
        
        if attempt < max_attempts:
            print(f"[SMTP] Retrying in 2 seconds...")
            await asyncio.sleep(2)
    
    print(f"[SMTP] Failed to connect after {max_attempts} attempts")
    return False
