import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthCard, { authLinkClass } from '../../components/auth/AuthCard.jsx';
import FormField from '../../components/common/FormField.jsx';
import Button from '../../components/common/Button.jsx';
import { forgotPassword } from '../../services/auth.service.js';
import { getErrorMessage } from '../../utils/errors.js';
import { EMAIL_PATTERN } from '../../utils/validation.js';

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    try {
      await forgotPassword(email);
      setSentTo(email);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <AuthCard
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a link to choose a new one."
      footer={
        <Link to="/login" className={authLinkClass}>
          Back to log in
        </Link>
      }
    >
      {sentTo ? (
        <div role="status" className="rounded-lg bg-brand-50 p-4 text-sm text-brand-900">
          If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. The link works once and
          expires in 1 hour.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Enter your email',
              pattern: { value: EMAIL_PATTERN, message: 'Enter a valid email address' },
            })}
          />
          <Button type="submit" loading={isSubmitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
